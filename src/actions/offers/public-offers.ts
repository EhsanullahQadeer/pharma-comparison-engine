"use server";

import type { Prisma } from "@/generated/prisma/client";
import { deliveredTotalPence, displayName, freshnessTier, perTabletPence, providerSlug } from "@/lib/comparison";
import { prisma } from "@/lib/prisma";
import type { PublicOffer } from "@/types/comparison";

// Public, unauthenticated read. Only offers a staff member explicitly published, from a provider
// whose status is PUBLISHED, and only while the price is inside the 48h freshness window — the
// public site never sees a draft, a withheld pharmacy or an expired price.
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
      provider: { select: { id: true, tradingName: true, websiteDomain: true, logoUrl: true, discounts: liveDiscounts } },
      discounts: liveDiscounts,
      productVariant: { select: { id: true, ingredient: true, brandName: true, strengthMg: true, formulation: true, packQuantity: true } },
    },
  });

  return offers.flatMap((offer) => {
    const checkedAt = offer.priceVerifiedAt ?? offer.retrievedAt;
    const freshness = freshnessTier(checkedAt, now);
    if (freshness === "expired") return [];
    const total = deliveredTotalPence(offer);
    return [{
      id: offer.id,
      providerId: offer.provider.id,
      providerName: displayName(offer.provider.tradingName),
      providerSlug: providerSlug(offer.provider.websiteDomain),
      providerDomain: offer.provider.websiteDomain,
      providerLogoUrl: offer.provider.logoUrl,
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
      freshness,
      // The pharmacy's site-wide discounts apply to every one of its offers.
      discounts: [...offer.discounts, ...offer.provider.discounts],
    }];
  });
}
