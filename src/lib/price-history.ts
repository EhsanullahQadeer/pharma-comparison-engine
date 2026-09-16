import type { Prisma } from "@/generated/prisma/client";

// Single write path for a PriceHistory snapshot — call inside the same $transaction as whatever
// mutation triggered it (an offer edit, or a discount create/delete), per Code Rule 13. Reads the
// offer's current state itself rather than trusting a caller-supplied snapshot, so offers.ts and
// discounts.ts can't drift out of sync on what "the current state" means.
export async function recordPriceHistorySnapshot(tx: Prisma.TransactionClient, offerId: string, effectiveFrom: Date) {
  const offer = await tx.offer.findUniqueOrThrow({
    where: { id: offerId },
    include: {
      discounts: {
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const activeDiscount = offer.discounts[0];

  await tx.priceHistory.create({
    data: {
      offerId: offer.id,
      itemPricePence: offer.itemPricePence,
      deliveryFeePence: offer.deliveryFeePence,
      consultationFeePence: offer.consultationFeePence,
      otherMandatoryFeesPence: offer.otherMandatoryFeesPence,
      deliveredTotalPence: offer.itemPricePence + offer.deliveryFeePence + offer.consultationFeePence + offer.otherMandatoryFeesPence,
      availability: offer.availability,
      activeDiscountSnapshot: activeDiscount
        ? {
            eligibility: activeDiscount.eligibility,
            valueType: activeDiscount.valueType,
            valuePence: activeDiscount.valuePence,
            valuePercent: activeDiscount.valuePercent,
            stackable: activeDiscount.stackable,
            expiresAt: activeDiscount.expiresAt,
          }
        : undefined,
      effectiveFrom,
    },
  });
}
