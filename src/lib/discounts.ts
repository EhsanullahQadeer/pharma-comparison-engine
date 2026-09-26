import type { DiscountValueType } from "@/generated/prisma/client";
import { formatPence } from "@/lib/money";
import type { PublicDiscount, PublicOffer } from "@/types/comparison";

const headline: Record<DiscountValueType, (discount: PublicDiscount) => string> = {
  PERCENT: (discount) => `${discount.valuePercent ?? 0}% off`,
  FIXED_AMOUNT: (discount) => `${formatPence(discount.valuePence ?? 0)} off`,
};

export function discountHeadline(discount: PublicDiscount) {
  return headline[discount.valueType](discount);
}

// One pharmacy's discounts across all its offers, de-duplicated (the same code is often recorded
// against several strengths/packs) and keyed by what a shopper would actually see.
export function providerDiscounts(offers: PublicOffer[]): PublicDiscount[] {
  const seen = new Map<string, PublicDiscount>();
  for (const discount of offers.flatMap((offer) => offer.discounts)) {
    const key = [discount.code ?? "", discount.eligibility.toLowerCase(), discount.valueType, discount.valuePercent, discount.valuePence].join("|");
    if (!seen.has(key)) seen.set(key, discount);
  }
  return [...seen.values()];
}
