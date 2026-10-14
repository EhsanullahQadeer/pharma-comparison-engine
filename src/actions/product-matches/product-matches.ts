"use server";

import { revalidatePath } from "next/cache";

import { collectPriceForMatch } from "@/actions/price-collection/collect-price";
import type { Ingredient } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { ensureCatalogueVariant, type CatalogueVariant } from "@/lib/product-detection/catalogue-variants";
import { detectEdProductMatchesWithBrowserFallback, readOfferedOptionsInBrowser } from "@/lib/product-detection/detect-products-in-browser";
import { findOfferedOptionsOnPage, ingredientWords, pageAffinity, pageIngredients } from "@/lib/product-detection/page-variants";
import { revalidatePublicSite } from "@/lib/revalidate-public-site";
import { requireStaffRole } from "@/lib/staff-auth";
import type { OfferedOption, ProductDetectionMethod } from "@/types/product-detection";

export type RunProductDetectionState = {
  error?: string;
  result?: { candidatesSeen: number; newMatches: number; newVariants: number; method: ProductDetectionMethod };
};

// Manual "Run now" trigger, one provider at a time (pilot scope — see docs/current-tasks.md's
// 2026-09-18 entry). Re-running is safe: matches already staff-reviewed (CONFIRMED/REJECTED) are
// left untouched via the (providerId, candidateUrl) unique constraint; only a still-NEW match gets
// its signals refreshed, and a genuinely new URL creates a new NEW row.
export async function runProductDetectionForProvider(providerId: string): Promise<RunProductDetectionState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to run product detection." };
  }

  // The postcode from the registry record it was discovered from answers shops that ask for one
  // before listing products.
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { id: true, websiteDomain: true, discoveryCandidates: { where: { postcode: { not: null } }, select: { postcode: true }, take: 1 } },
  });
  if (!provider) return { error: "Provider not found." };
  const postcode = provider.discoveryCandidates[0]?.postcode ?? undefined;

  let detected;
  let method: ProductDetectionMethod;
  try {
    ({ matches: detected, method } = await detectEdProductMatchesWithBrowserFallback(provider.websiteDomain, { postcode }));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Product detection failed." };
  }

  const catalogue: CatalogueVariant[] = await prisma.productVariant.findMany({
    select: { id: true, ingredient: true, brandName: true, strengthMg: true, packQuantity: true, formulation: true },
  });

  let newMatches = 0;
  let newVariants = 0;

  // First pass: every strength/pack option each page has a price for — each option's catalogue
  // variant is added first if the catalogue lacks it. Several pages can list the same option (its
  // own page, plus comparison tables on sibling pages), so each variant goes to the one page whose
  // address fits its product best. Each page is read once, for every medicine it was matched on —
  // both on an ED condition page that sells everything itself (see pageIngredients).
  const detectedPages = new Map<string, { match: (typeof detected)[number]; ingredients: Ingredient[] }>();
  for (const match of detected) {
    const ingredients = [...new Set([...detectedPages.get(match.candidateUrl)?.ingredients ?? [], ...pageIngredients(match.candidateUrl, match.ingredient)])];
    detectedPages.set(match.candidateUrl, { match: detectedPages.get(match.candidateUrl)?.match ?? match, ingredients });
  }
  const optionsByUrl = new Map<string, OfferedOption[]>();
  const blockedPages: { url: string; ingredients: Ingredient[] }[] = [];
  for (const [url, { ingredients }] of detectedPages) {
    const { options, blocked } = await findOfferedOptionsOnPage(url, ingredients);
    optionsByUrl.set(url, options);
    if (blocked) blockedPages.push({ url, ingredients });
  }
  // Pages a plain request couldn't read (a security check in front of the site, or prices the
  // page's scripts add) are read in the Chrome window instead. If that fails, they simply keep no
  // options and get an undecided match.
  const browserOptions = await readOfferedOptionsInBrowser(blockedPages, provider.websiteDomain, { postcode }).catch(() => new Map<string, OfferedOption[]>());
  for (const [url, options] of browserOptions) optionsByUrl.set(url, options);

  const pages: { match: (typeof detected)[number]; priced: { variantId: string; ingredient: Ingredient }[] }[] = [];
  const bestPage = new Map<string, { url: string; affinity: number }>();
  for (const { match } of detectedPages.values()) {
    const priced: { variantId: string; ingredient: Ingredient }[] = [];
    for (const option of optionsByUrl.get(match.candidateUrl) ?? []) {
      const { variant, created } = await ensureCatalogueVariant(option, catalogue, staffUser.id);
      if (created) newVariants += 1;
      priced.push({ variantId: variant.id, ingredient: option.ingredient });
      const affinity = pageAffinity(match.candidateUrl, option);
      if (affinity > (bestPage.get(variant.id)?.affinity ?? -1)) bestPage.set(variant.id, { url: match.candidateUrl, affinity });
    }
    pages.push({ match, priced });
  }

  const providerMatches = await prisma.productMatch.findMany({
    where: { providerId },
    select: { id: true, status: true, candidateUrl: true, productVariantId: true },
  });
  // A variant this pharmacy already has an undecided or confirmed match for keeps that page.
  const placed = new Set(providerMatches.filter((row) => row.status !== "REJECTED").map((row) => row.productVariantId));

  // Second pass: a suggested (still NEW) match per option on its page; staff confirm or reject each.
  // Variants already matched on a page, in any status, are left alone there.
  for (const { match, priced } of pages) {
    const existing = providerMatches.filter((row) => row.candidateUrl === match.candidateUrl);
    const known = new Set(existing.map((row) => row.productVariantId));
    const suggestions = priced.filter(({ variantId }) => bestPage.get(variantId)?.url === match.candidateUrl && !known.has(variantId) && !placed.has(variantId));
    if (suggestions.length > 0) {
      await prisma.productMatch.createMany({
        // An option for the other medicine on a combined ED page is credited to that medicine.
        data: suggestions.map(({ variantId, ingredient }) => ({
          providerId,
          candidateUrl: match.candidateUrl,
          matchedIngredient: ingredient,
          matchedTokens: ingredient === match.ingredient ? match.matchedTokens : [ingredientWords[ingredient]],
          confidence: match.confidence,
          productVariantId: variantId,
        })),
        skipDuplicates: true,
      });
      newMatches += suggestions.length;
    } else if (existing.length === 0 && priced.length === 0) {
      // Nothing readable on the page: one undecided match for staff to assign a variant by hand.
      await prisma.productMatch.create({
        data: { providerId, candidateUrl: match.candidateUrl, matchedIngredient: match.ingredient, matchedTokens: match.matchedTokens, confidence: match.confidence },
      });
      newMatches += 1;
    } else {
      // Refresh the signals on a still-undecided match; a CONFIRMED/REJECTED one is left alone.
      await prisma.productMatch.updateMany({
        where: { id: { in: existing.filter((row) => row.status === "NEW").map((row) => row.id) } },
        data: { matchedIngredient: match.ingredient, matchedTokens: match.matchedTokens, confidence: match.confidence },
      });
    }
  }

  await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "ProductMatch", entityId: providerId, changes: { candidatesSeen: detected.length, newMatches, newVariants, method } });

  revalidatePath(`/admin/pharmacies/${providerId}`);
  revalidatePath("/admin/reviews");
  return { result: { candidatesSeen: detected.length, newMatches, newVariants, method } };
}

// Only matches a staff member hasn't yet acted on — same reviewedAt-drives-queue-membership
// pattern as getDiscoveryCandidatesForReview.
// `providerId` narrows the queue to one pharmacy (its admin page lists its own suggestions).
export async function getProductMatchesForReview(providerId?: string) {
  await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  return prisma.productMatch.findMany({
    where: { status: "NEW", reviewedAt: null, providerId },
    orderBy: { detectedAt: "desc" },
    include: { provider: { select: { id: true, tradingName: true } } },
  });
}

export type ConfirmProductMatchState = { error?: string };

// Picking the exact ProductVariant is a deliberate staff decision — detection only narrows down to
// an ingredient, never a specific strength/pack. Does not create an Offer: that needs a real price,
// which only exists once the price-collection pilot's first scrape succeeds (not built yet).
export async function confirmProductMatch(matchId: string, productVariantId: string): Promise<ConfirmProductMatchState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to review product matches." };
  }

  const match = await prisma.productMatch.findUnique({ where: { id: matchId }, select: { id: true, reviewedAt: true, providerId: true, candidateUrl: true } });
  if (!match) return { error: "Product match not found." };
  if (match.reviewedAt) return { error: "This match has already been reviewed." };

  const variant = await prisma.productVariant.findUnique({ where: { id: productVariantId }, select: { id: true } });
  if (!variant) return { error: "Product variant not found." };

  // Detection may already have suggested this exact variant for the page as its own row.
  const duplicate = await prisma.productMatch.findFirst({
    where: { providerId: match.providerId, candidateUrl: match.candidateUrl, productVariantId, id: { not: matchId } },
    select: { id: true },
  });
  if (duplicate) return { error: "This page already has a match for that variant — confirm or reject that one instead." };

  await prisma.productMatch.update({
    where: { id: matchId },
    data: { status: "CONFIRMED", productVariantId, reviewedByStaffId: staffUser.id, reviewedAt: new Date() },
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "ProductMatch", entityId: matchId, changes: { status: "CONFIRMED", productVariantId } });

  // The pharmacy's page lists it under price collection from now on.
  revalidatePath(`/admin/pharmacies/${match.providerId}`);
  revalidatePath("/admin/reviews");
  return {};
}

export type ConfirmAndCollectProductMatchState = {
  error?: string;
  result?: { itemPricePence: number; deliveryFeePence: number; updatedAt: Date };
};

export async function confirmAndCollectProductMatch(matchId: string, productVariantId: string, humanAssist = false): Promise<ConfirmAndCollectProductMatchState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to review product matches." };
  }

  const confirmResult = await confirmProductMatch(matchId, productVariantId);
  if (confirmResult.error) return confirmResult;

  try {
    const result = await collectPriceForMatch(matchId, { actorId: staffUser.id, humanAssist });
    const match = await prisma.productMatch.findUnique({ where: { id: matchId }, select: { providerId: true } });
    if (match) revalidatePath(`/admin/pharmacies/${match.providerId}`);
    revalidatePath("/admin/reviews");
    return { result: { itemPricePence: result.itemPricePence, deliveryFeePence: result.deliveryFeePence, updatedAt: result.updatedAt } };
  } catch (error) {
    return { error: error instanceof Error ? `Match confirmed, but price scraping failed: ${error.message}` : "Match confirmed, but price scraping failed." };
  }
}

export type RejectProductMatchState = { error?: string };

export async function rejectProductMatch(matchId: string): Promise<RejectProductMatchState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to review product matches." };
  }

  const match = await prisma.productMatch.findUnique({ where: { id: matchId }, select: { id: true, reviewedAt: true, providerId: true } });
  if (!match) return { error: "Product match not found." };
  if (match.reviewedAt) return { error: "This match has already been reviewed." };

  await prisma.productMatch.update({
    where: { id: matchId },
    data: { status: "REJECTED", reviewedByStaffId: staffUser.id, reviewedAt: new Date() },
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "ProductMatch", entityId: matchId, changes: { status: "REJECTED" } });

  revalidatePath(`/admin/pharmacies/${match.providerId}`);
  revalidatePath("/admin/reviews");
  return {};
}

export type RejectConfirmedProductMatchesState = { error?: string; rejected?: number; removedPrices?: number };

// Takes confirmed product pages back out of price collection (a wrong product, a page that repeats
// another one, a page no price can be read from). The page is marked rejected, so "Detect products"
// won't suggest it again, and its schedule and queued checks stop. A price saved from the page goes
// with it: it was read from a page staff have now decided is not this product.
export async function rejectConfirmedProductMatches(matchIds: string[]): Promise<RejectConfirmedProductMatchesState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to review product matches." };
  }

  const matches = await prisma.productMatch.findMany({
    where: { id: { in: matchIds }, status: "CONFIRMED" },
    select: { id: true, providerId: true, offerId: true, productVariantId: true },
  });
  if (matches.length === 0) return { error: "None of the selected product pages is still confirmed." };

  const ids = matches.map((match) => match.id);
  const offerIds = matches.flatMap((match) => match.offerId ?? []);
  await prisma.$transaction(async (tx) => {
    await tx.priceCollectionJob.deleteMany({ where: { productMatchId: { in: ids }, status: "QUEUED" } });
    await tx.productMatch.updateMany({
      where: { id: { in: ids } },
      data: { status: "REJECTED", reviewedByStaffId: staffUser.id, reviewedAt: new Date(), scrapeEnabled: false, nextScrapeAt: null, lastScrapeStatus: "NOT_CONFIGURED", requiresHumanAssist: false },
    });
    // Deleting the offer clears the match's link to it (and removes its price history).
    await tx.offer.deleteMany({ where: { id: { in: offerIds } } });
  });

  await Promise.all(matches.map((match) => recordAuditLog({
    actorId: staffUser.id,
    action: "UPDATE",
    entityType: "ProductMatch",
    entityId: match.id,
    changes: { status: "REJECTED", wasConfirmed: true, removedOfferId: match.offerId },
  })));

  for (const providerId of new Set(matches.map((match) => match.providerId))) revalidatePath(`/admin/pharmacies/${providerId}`);
  for (const variantId of new Set(matches.flatMap((match) => match.productVariantId ?? []))) revalidatePath(`/admin/catalogue/product-variants/${variantId}/prices`);
  if (offerIds.length > 0) revalidatePublicSite();
  return { rejected: matches.length, removedPrices: offerIds.length };
}
