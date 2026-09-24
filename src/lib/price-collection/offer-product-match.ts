import type { Prisma } from "@/generated/prisma/client";
import { variantTokens } from "@/lib/price-collection/variant-label";

type LinkOfferInput = {
  offerId: string;
  providerId: string;
  productVariantId: string;
  productPageUrl: string;
  staffUserId: string;
};

// A staff member entering a price by hand has checked that this pharmacy sells the exact variant at
// that page — the same judgement as confirming a detected ProductMatch — so the offer gets a
// CONFIRMED match on that URL and later scrapes go straight to it instead of searching the site.
// Matches are unique per page per variant, so a page listing several pack sizes carries one each.
//
// Returns false (offer left unmatched) only when this page's match for this variant already carries
// a different offer, i.e. the pharmacy has a second price for the same variant.
export async function linkOfferToProductMatch(tx: Prisma.TransactionClient, input: LinkOfferInput): Promise<boolean> {
  const variant = await tx.productVariant.findUniqueOrThrow({
    where: { id: input.productVariantId },
    select: { ingredient: true, brandName: true },
  });
  const page = { providerId: input.providerId, candidateUrl: input.productPageUrl };
  const [current, forVariant, undecided] = await Promise.all([
    tx.productMatch.findUnique({ where: { offerId: input.offerId }, select: { id: true } }),
    tx.productMatch.findFirst({ where: { ...page, productVariantId: input.productVariantId }, select: { id: true, offerId: true } }),
    // A detected page no one has pinned to a variant yet — claimed rather than duplicated.
    tx.productMatch.findFirst({ where: { ...page, productVariantId: null, offerId: null }, select: { id: true } }),
  ]);

  const confirmed = {
    status: "CONFIRMED" as const,
    matchedIngredient: variant.ingredient,
    matchedTokens: variantTokens(variant),
    productVariantId: input.productVariantId,
    offerId: input.offerId,
    reviewedByStaffId: input.staffUserId,
    reviewedAt: new Date(),
  };
  // A different page means the previous page's scrape results no longer describe this offer.
  const freshScrapeState = { lastScrapeStatus: "NOT_CONFIGURED" as const, lastScrapeError: null, requiresHumanAssist: false };

  if (current && current.id === forVariant?.id) {
    await tx.productMatch.update({ where: { id: current.id }, data: confirmed });
    return true;
  }
  if (forVariant?.offerId) {
    await unlinkOfferFromProductMatch(tx, input.offerId);
    return false;
  }

  const target = forVariant ?? undecided;
  if (target) {
    if (current) await unlinkOfferFromProductMatch(tx, input.offerId);
    await tx.productMatch.update({ where: { id: target.id }, data: { ...confirmed, ...freshScrapeState } });
  } else if (current) {
    await tx.productMatch.update({
      where: { id: current.id },
      data: { ...confirmed, ...freshScrapeState, candidateUrl: input.productPageUrl, confidence: "HIGH" },
    });
  } else {
    await tx.productMatch.create({ data: { ...confirmed, ...page, confidence: "HIGH" } });
  }
  return true;
}

// The match itself stays (still a confirmed product page for the pharmacy); only the offer link goes.
export async function unlinkOfferFromProductMatch(tx: Prisma.TransactionClient, offerId: string) {
  await tx.productMatch.updateMany({ where: { offerId }, data: { offerId: null } });
}
