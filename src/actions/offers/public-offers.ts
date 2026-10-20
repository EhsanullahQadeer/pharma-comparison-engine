"use server";

import { Prisma } from "@/generated/prisma/client";
import { deliveredTotalPence, displayName, freshnessTier, perTabletPence, providerSlug } from "@/lib/comparison";
import { bestDiscount } from "@/lib/discounts";
import { HISTORY_DAYS, MOVEMENT_WINDOW_DAYS, priceMovement } from "@/lib/price-movement";
import { prisma } from "@/lib/prisma";
import { showTrustpilotScores } from "@/lib/trustpilot";
import type { PriceHistoryAggregate, PricePoint, PublicOffer } from "@/types/comparison";

const DAY_MS = 24 * 60 * 60 * 1000;

// The pharmacy facts shoppers can filter and read (see PublicProviderFacts).
const providerFactsSelect = {
  serviceRegions: true,
  nextDayDelivery: true,
  discreetPackaging: true,
  paymentMethods: true,
  inspectionOutcome: true,
  inspectionDate: true,
  trustpilotUrl: true,
  trustpilotScoreTenths: true,
  trustpilotReviewCount: true,
} satisfies Prisma.ProviderSelect;
const NO_HISTORY: PriceHistoryAggregate = { recentPence: [], low30Pence: null, high30Pence: null };

// One grouped read for every offer's two latest checks and 30-day range, rather than a query per
// offer (medicine + delivery: the part each check reads).
async function priceHistoryAggregates(offerIds: string[], now: Date) {
  if (offerIds.length === 0) return new Map<string, PriceHistoryAggregate>();
  const since = new Date(now.getTime() - MOVEMENT_WINDOW_DAYS * DAY_MS);
  const rows = await prisma.$queryRaw<Array<{ offerId: string; recent: number[]; low30: number | null; high30: number | null }>>(Prisma.sql`
    SELECT "offerId",
      (array_agg("itemPricePence" + "deliveryFeePence" ORDER BY "effectiveFrom" DESC, "recordedAt" DESC))[1:2] AS recent,
      MIN("itemPricePence" + "deliveryFeePence") FILTER (WHERE "effectiveFrom" >= ${since}) AS low30,
      MAX("itemPricePence" + "deliveryFeePence") FILTER (WHERE "effectiveFrom" >= ${since}) AS high30
    FROM "PriceHistory"
    WHERE "offerId" IN (${Prisma.join(offerIds)})
    GROUP BY "offerId"
  `);
  return new Map(rows.map((row) => [row.offerId, { recentPence: row.recent, low30Pence: row.low30, high30Pence: row.high30 }]));
}

// Public, unauthenticated read. Only offers a staff member explicitly published, from a provider
// whose status is PUBLISHED — the public site never sees a draft or a withheld pharmacy. A price
// is shown however long ago it was checked, labelled with that date.
export async function getPublicOffers(where: { providerId?: string } = {}): Promise<PublicOffer[]> {
  const now = new Date();
  // Only discounts staff entered or approved; a scraped one still awaiting review is never shown.
  const liveDiscounts = {
    where: { status: "APPROVED", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { createdAt: "asc" },
    select: { id: true, eligibility: true, code: true, valueType: true, valuePence: true, valuePercent: true, stackable: true, expiresAt: true },
  } satisfies Prisma.DiscountFindManyArgs;
  const offers = await prisma.offer.findMany({
    where: { ...where, publishedAt: { not: null }, provider: { status: "PUBLISHED" } },
    select: {
      id: true,
      itemPricePence: true,
      deliveryFeePence: true,
      consultationFeePence: true,
      otherMandatoryFeesPence: true,
      availability: true,
      purchaseModel: true,
      sourceUrl: true,
      retrievedAt: true,
      priceVerifiedAt: true,
      feeVerifiedAt: true,
      provider: { select: { id: true, tradingName: true, websiteDomain: true, logoUrl: true, regulatorType: true, regulatorReference: true, dispensingPartnerName: true, discounts: liveDiscounts, ...providerFactsSelect } },
      discounts: liveDiscounts,
      productVariant: { select: { id: true, ingredient: true, brandName: true, strengthMg: true, formulation: true, packQuantity: true } },
    },
  });

  const history = await priceHistoryAggregates(offers.map((offer) => offer.id), now);
  const scores = showTrustpilotScores();

  return offers.map((offer) => {
    const checkedAt = offer.priceVerifiedAt ?? offer.retrievedAt;
    const total = deliveredTotalPence(offer);
    // The pharmacy's site-wide discounts apply to every one of its offers.
    const discounts = [...offer.discounts, ...offer.provider.discounts];
    const code = bestDiscount(discounts, offer.itemPricePence);
    return {
      id: offer.id,
      providerId: offer.provider.id,
      providerName: displayName(offer.provider.tradingName),
      providerSlug: providerSlug(offer.provider.websiteDomain),
      providerDomain: offer.provider.websiteDomain,
      providerLogoUrl: offer.provider.logoUrl,
      providerRegulatorType: offer.provider.regulatorType,
      providerRegulatorReference: offer.provider.regulatorReference,
      providerDispensingPartnerName: offer.provider.dispensingPartnerName,
      providerFacts: {
        serviceRegions: offer.provider.serviceRegions,
        nextDayDelivery: offer.provider.nextDayDelivery,
        discreetPackaging: offer.provider.discreetPackaging,
        paymentMethods: offer.provider.paymentMethods,
        inspectionOutcome: offer.provider.inspectionOutcome,
        inspectionDate: offer.provider.inspectionDate,
        trustpilotUrl: offer.provider.trustpilotUrl,
        trustpilotScoreTenths: scores ? offer.provider.trustpilotScoreTenths : null,
        trustpilotReviewCount: scores ? offer.provider.trustpilotReviewCount : null,
      },
      variant: offer.productVariant,
      itemPricePence: offer.itemPricePence,
      deliveryFeePence: offer.deliveryFeePence,
      consultationFeePence: offer.consultationFeePence,
      otherMandatoryFeesPence: offer.otherMandatoryFeesPence,
      deliveredTotalPence: total,
      perTabletPence: perTabletPence(total, offer.productVariant.packQuantity),
      feesVerified: offer.feeVerifiedAt !== null,
      availability: offer.availability,
      purchaseModel: offer.purchaseModel,
      sourceUrl: offer.sourceUrl,
      checkedAt,
      freshness: freshnessTier(checkedAt, now),
      discounts,
      discountedTotalPence: code ? total - code.savingPence : null,
      codeDiscountId: code?.discount.id ?? null,
      ...priceMovement(offer.itemPricePence + offer.deliveryFeePence, history.get(offer.id) ?? NO_HISTORY),
    };
  });
}

// Daily prices over the last 90 days for the given offers, for the sparklines on a pharmacy's
// page. Public (callable by anyone), so it re-applies the published-offer, published-pharmacy rule
// itself and caps how many offers one call can ask about.
const MAX_HISTORY_OFFERS = 500;

export async function getPublicPriceHistory(offerIds: string[]): Promise<Map<string, PricePoint[]>> {
  const history = new Map<string, PricePoint[]>();
  const ids = [...new Set(offerIds.filter((id) => typeof id === "string"))].slice(0, MAX_HISTORY_OFFERS);
  if (ids.length === 0) return history;
  const since = new Date(Date.now() - HISTORY_DAYS * DAY_MS);
  const rows = await prisma.$queryRaw<Array<{ offerId: string; day: Date; pence: number }>>(Prisma.sql`
    SELECT h."offerId", date_trunc('day', h."effectiveFrom") AS day,
      (array_agg(h."itemPricePence" + h."deliveryFeePence" ORDER BY h."effectiveFrom" DESC, h."recordedAt" DESC))[1] AS pence
    FROM "PriceHistory" h
    JOIN "Offer" o ON o.id = h."offerId"
    JOIN "Provider" p ON p.id = o."providerId"
    WHERE h."offerId" IN (${Prisma.join(ids)}) AND h."effectiveFrom" >= ${since}
      AND o."publishedAt" IS NOT NULL AND p.status = 'PUBLISHED'
    GROUP BY h."offerId", day
    ORDER BY h."offerId", day
  `);
  for (const row of rows) history.set(row.offerId, [...(history.get(row.offerId) ?? []), { day: row.day, pence: row.pence }]);
  return history;
}
