"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Ingredient, Prisma, SupplyClassification } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { normalizePublicUrl } from "@/lib/discovery/public-web-policy";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { HumanVerificationError, openHumanBrowser, waitForHumanVerification } from "@/lib/price-collection/human-browser";
import { scrapeProductPrice, type ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { prisma } from "@/lib/prisma";
import { collectCandidateUrls } from "@/lib/product-detection/detect-products";
import { edCategoryRootSegments, matchEdProductPath } from "@/lib/product-detection/ed-tokens";
import { requireStaffRole } from "@/lib/staff-auth";

import type { Page } from "playwright";

const productVariantSchema = z.object({
  ingredient: z.enum(Ingredient),
  brandName: z.string().trim().optional(),
  strengthMg: z.coerce.number().int().min(1, "Enter the strength in mg."),
  formulation: z.string().trim().min(2, "Describe the formulation (e.g. \"Film-coated tablet\")."),
  packQuantity: z.coerce.number().int().min(1, "Enter the pack quantity."),
  supplyClassification: z.enum(SupplyClassification),
});

export type ProductVariantState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof productVariantSchema>, string[]>>;
};

function parseProductVariantFormData(formData: FormData) {
  return productVariantSchema.safeParse({
    ingredient: formData.get("ingredient"),
    brandName: formData.get("brandName") || undefined,
    strengthMg: formData.get("strengthMg"),
    formulation: formData.get("formulation"),
    packQuantity: formData.get("packQuantity"),
    supplyClassification: formData.get("supplyClassification"),
  });
}

export async function createProductVariant(_prevState: ProductVariantState, formData: FormData): Promise<ProductVariantState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to add product variants." };
  }

  const parsed = parseProductVariantFormData(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const variant = await prisma.productVariant.create({ data: parsed.data });
  await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "ProductVariant", entityId: variant.id, changes: parsed.data });

  revalidatePath("/admin/catalogue/product-variants");
  return {};
}

export async function updateProductVariant(id: string, _prevState: ProductVariantState, formData: FormData): Promise<ProductVariantState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to edit product variants." };
  }

  const parsed = parseProductVariantFormData(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const variant = await prisma.productVariant.update({ where: { id }, data: parsed.data });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "ProductVariant", entityId: variant.id, changes: parsed.data });

  revalidatePath("/admin/catalogue/product-variants");
  return {};
}

export type DeleteProductVariantState = { error?: string };

export async function deleteProductVariant(id: string): Promise<DeleteProductVariantState> {
  const staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);

  const offerCount = await prisma.offer.count({ where: { productVariantId: id } });
  if (offerCount > 0) {
    return { error: `Cannot delete — ${offerCount} offer${offerCount === 1 ? "" : "s"} still reference this variant.` };
  }

  await prisma.productVariant.delete({ where: { id } });
  await recordAuditLog({ actorId: staffUser.id, action: "DELETE", entityType: "ProductVariant", entityId: id, changes: {} });

  revalidatePath("/admin/catalogue/product-variants");
  return {};
}

export async function getProductVariants(search?: string, page = 1, pageSize: number = DEFAULT_PAGE_SIZE) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  const query = search?.trim();
  const where = query
    ? { OR: [{ brandName: { contains: query, mode: "insensitive" as const } }, { formulation: { contains: query, mode: "insensitive" as const } }] }
    : undefined;

  const [variants, total] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      orderBy: [{ ingredient: "asc" }, { strengthMg: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productVariant.count({ where }),
  ]);

  return { variants, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

// Unpaginated list for use in <select> pickers (offer forms) — catalogue size is small (roadmap
// scope is sildenafil/tadalafil variants only), so a full list is fine here.
export async function getAllProductVariants() {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  return prisma.productVariant.findMany({ orderBy: [{ ingredient: "asc" }, { strengthMg: "asc" }] });
}

export type ScrapeVariantPricesState = {
  error?: string;
  result?: { attempted: number; scraped: number; failed: number };
};

function variantTokens(variant: { ingredient: Ingredient; brandName: string | null }) {
  const tokenMap = {
    SILDENAFIL: ["sildenafil", "viagra"],
    TADALAFIL: ["tadalafil", "cialis"],
  } satisfies Record<Ingredient, string[]>;
  return [...new Set([...(variant.brandName ? [variant.brandName.toLowerCase()] : []), ...tokenMap[variant.ingredient]])];
}

function isEdCategoryRoot(url: string) {
  const segments = new URL(url).pathname.split("/").filter(Boolean).map((segment) => segment.toLowerCase());
  return segments.length === 1 && edCategoryRootSegments.has(segments[0]);
}

async function findProviderVariantCandidateUrls(websiteDomain: string, ingredient: Ingredient, tokens: string[], page?: Page) {
  let urls: string[];
  if (page) {
    const homepage = normalizePublicUrl(`https://${websiteDomain}`);
    await page.goto(homepage.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForHumanVerification(page, true);
    const origin = new URL(page.url()).origin;
    urls = await page.locator("a[href]").evaluateAll(elements => elements.map(element => (element as HTMLAnchorElement).href));
    urls = urls.filter(url => {
      try { return new URL(url).origin === origin; } catch { return false; }
    });
  } else {
    urls = await collectCandidateUrls(websiteDomain);
  }
  const candidates: { candidateUrl: string; matchedTokens: string[]; confidence: "HIGH" | "MEDIUM" }[] = [];
  for (const url of urls) {
    const pathMatch = matchEdProductPath(new URL(url).pathname);
    if (pathMatch?.ingredient === ingredient) {
      candidates.push({ candidateUrl: url, matchedTokens: pathMatch.matchedTokens, confidence: pathMatch.confidence });
    } else if (isEdCategoryRoot(url)) {
      candidates.push({ candidateUrl: url, matchedTokens: tokens, confidence: "MEDIUM" });
    }
  }

  const rank = { HIGH: 0, MEDIUM: 1 } satisfies Record<"HIGH" | "MEDIUM", number>;
  return [...new Map(candidates.map((candidate) => [candidate.candidateUrl, candidate])).values()]
    .sort((a, b) => rank[a.confidence] - rank[b.confidence])
    .slice(0, 3);
}

async function saveVariantScrapedOffer(providerId: string, productVariantId: string, scraped: ScrapedPrice) {
  const now = new Date();
  const deliveredTotalPence = scraped.itemPricePence + scraped.deliveryFeePence;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.offer.findFirst({
      where: { providerId, productVariantId, productMatch: null },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
    const offer = existing
      ? await tx.offer.update({
        where: { id: existing.id },
        data: {
          itemPricePence: scraped.itemPricePence,
          deliveryFeePence: scraped.deliveryFeePence,
          deliveryAssumption: scraped.deliveryAssumption,
          availability: scraped.availability,
          sourceUrl: scraped.sourceUrl,
          retrievedAt: now,
          priceVerifiedAt: now,
        },
      })
      : await tx.offer.create({
        data: {
          providerId,
          productVariantId,
          itemPricePence: scraped.itemPricePence,
          deliveryFeePence: scraped.deliveryFeePence,
          deliveryAssumption: scraped.deliveryAssumption,
          availability: scraped.availability,
          sourceUrl: scraped.sourceUrl,
          retrievedAt: now,
          priceVerifiedAt: now,
        },
      });

    await tx.priceHistory.create({
      data: {
        offerId: offer.id,
        itemPricePence: scraped.itemPricePence,
        deliveryFeePence: scraped.deliveryFeePence,
        deliveredTotalPence,
        availability: scraped.availability,
        effectiveFrom: now,
      },
    });

    return offer;
  });
}

export async function scrapePricesForVariant(productVariantId: string, humanAssist = false): Promise<ScrapeVariantPricesState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to scrape variant prices." };
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: productVariantId },
    select: { ingredient: true, brandName: true, strengthMg: true, packQuantity: true },
  });
  if (!variant) return { error: "Product variant not found." };
  const tokens = variantTokens(variant);

  const matches = await prisma.productMatch.findMany({
    where: { matchedIngredient: variant.ingredient, status: "CONFIRMED" },
    select: { id: true, providerId: true, candidateUrl: true, matchedTokens: true },
    orderBy: [{ productVariantId: "desc" }, { reviewedAt: "desc" }],
  });
  // With no confirmed matches, continue to the provider-site fallback below.
  // Newly discovered pharmacies can have product pages before staff match them.

  const humanBrowser = humanAssist ? await openHumanBrowser() : undefined;
  try {
    let scraped = 0;
    let failed = 0;
    const attemptedProviderIds = new Set<string>();
    for (const match of matches) {
      if (attemptedProviderIds.has(match.providerId)) continue;
      attemptedProviderIds.add(match.providerId);
      try {
        const scrapedPrice = await scrapeProductPrice(match.candidateUrl, {
          humanAssist,
          page: humanBrowser?.page,
          matchedTokens: tokens,
          variant: { strengthMg: variant.strengthMg, packQuantity: variant.packQuantity },
        });
        const offer = await saveVariantScrapedOffer(match.providerId, productVariantId, scrapedPrice);
        await prisma.productMatch.update({
          where: { id: match.id },
          data: {
            lastScrapedAt: new Date(),
            lastScrapeStatus: "SCRAPED",
            lastScrapeError: null,
            requiresHumanAssist: false,
          },
        });
        await recordAuditLog({
          actorId: staffUser.id,
          action: "UPDATE",
          entityType: "Offer",
          entityId: offer.id,
          changes: {
            productVariantId,
            providerId: match.providerId,
            itemPricePence: scrapedPrice.itemPricePence,
            deliveryFeePence: scrapedPrice.deliveryFeePence,
            source: scrapedPrice.source,
            collection: "variant-row",
          },
        });
        scraped += 1;
      } catch (error) {
        if (error instanceof HumanVerificationError) throw error;
        await prisma.productMatch.update({
          where: { id: match.id },
          data: {
            lastScrapedAt: new Date(),
            lastScrapeStatus: "FAILED",
            lastScrapeError: error instanceof Error ? error.message : "Variant price scrape failed.",
          },
        });
        failed += 1;
      }
    }

    const fallbackProviders = await prisma.provider.findMany({
      where: { status: { not: "ARCHIVED" }, id: { notIn: [...attemptedProviderIds] } },
      select: { id: true, websiteDomain: true },
    });

    for (const provider of fallbackProviders) {
      attemptedProviderIds.add(provider.id);
      try {
        const candidates = await findProviderVariantCandidateUrls(provider.websiteDomain, variant.ingredient, tokens, humanBrowser?.page);
        let saved = false;
        let lastError: unknown;
        for (const candidate of candidates) {
          try {
            const scrapedPrice = await scrapeProductPrice(candidate.candidateUrl, {
              humanAssist,
              page: humanBrowser?.page,
              matchedTokens: tokens,
              variant: { strengthMg: variant.strengthMg, packQuantity: variant.packQuantity },
            });
            const offer = await saveVariantScrapedOffer(provider.id, productVariantId, scrapedPrice);
            await recordAuditLog({
              actorId: staffUser.id,
              action: "UPDATE",
              entityType: "Offer",
              entityId: offer.id,
              changes: {
                productVariantId,
                providerId: provider.id,
                itemPricePence: scrapedPrice.itemPricePence,
                deliveryFeePence: scrapedPrice.deliveryFeePence,
                source: scrapedPrice.source,
                collection: "provider-fallback-variant-row",
              },
            });
            scraped += 1;
            saved = true;
            break;
          } catch (error) {
            if (error instanceof HumanVerificationError) throw error;
            lastError = error;
          }
        }
        if (!saved) {
          if (lastError) throw lastError;
          throw new Error("No likely product page found for this provider.");
        }
      } catch (error) {
        if (error instanceof HumanVerificationError) throw error;
        failed += 1;
      }
    }

    await recordAuditLog({
      actorId: staffUser.id,
      action: "UPDATE",
      entityType: "ProductVariant",
      entityId: productVariantId,
      changes: { priceScrape: { attempted: attemptedProviderIds.size, scraped, failed } },
    });

    revalidatePath("/admin/catalogue/product-variants");
    revalidatePath(`/admin/catalogue/product-variants/${productVariantId}/prices`);
    return { result: { attempted: attemptedProviderIds.size, scraped, failed } };
  } catch (error) {
    if (error instanceof HumanVerificationError) return { error: error.message };
    throw error;
  } finally {
    await humanBrowser?.close();
  }
}

export async function getProductVariantPricePage(productVariantId: string) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  const variant = await prisma.productVariant.findUnique({
    where: { id: productVariantId },
    include: {
      offers: {
        orderBy: { updatedAt: "desc" },
        include: {
          provider: { select: { id: true, tradingName: true, websiteDomain: true, status: true } },
          priceHistory: { orderBy: { recordedAt: "desc" } },
          productMatch: {
            select: {
              id: true,
              candidateUrl: true,
            },
          },
        },
      },
      productMatches: {
        where: { status: "CONFIRMED", offerId: null },
        include: { provider: { select: { id: true, tradingName: true, websiteDomain: true } } },
        orderBy: { reviewedAt: "desc" },
      },
    },
  });
  if (!variant) throw new Error("Product variant not found.");
  const matchIds = variant.offers.flatMap((offer) => offer.productMatch?.id ? [offer.productMatch.id] : []);
  const scrapeRows = matchIds.length > 0
    ? await prisma.$queryRaw<Array<{
      id: string;
      lastScrapeStatus: string | null;
      lastScrapeError: string | null;
      lastScrapedAt: Date | null;
      requiresHumanAssist: boolean;
    }>>(Prisma.sql`
      SELECT id, "lastScrapeStatus", "lastScrapeError", "lastScrapedAt", "requiresHumanAssist"
      FROM "ProductMatch"
      WHERE id IN (${Prisma.join(matchIds)})
    `)
    : [];
  const scrapeByMatchId = new Map(scrapeRows.map((row) => [row.id, row]));
  return {
    ...variant,
    offers: variant.offers.map((offer) => ({
      ...offer,
      productMatch: offer.productMatch ? { ...offer.productMatch, ...scrapeByMatchId.get(offer.productMatch.id) } : null,
    })),
  };
}
