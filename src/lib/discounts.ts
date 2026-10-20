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

const saving: Record<DiscountValueType, (discount: PublicDiscount, itemPricePence: number) => number> = {
  PERCENT: (discount, itemPricePence) => Math.round((itemPricePence * (discount.valuePercent ?? 0)) / 100),
  FIXED_AMOUNT: (discount) => discount.valuePence ?? 0,
};

// What a discount takes off the medicine price (never off delivery or fees, and never below zero).
export function discountSavingPence(discount: PublicDiscount, itemPricePence: number) {
  return Math.max(0, Math.min(itemPricePence, saving[discount.valueType](discount, itemPricePence)));
}

// The single discount that saves the most — codes aren't assumed to stack.
export function bestDiscount(discounts: PublicDiscount[], itemPricePence: number) {
  let best: { discount: PublicDiscount; savingPence: number } | null = null;
  for (const discount of discounts) {
    const savingPence = discountSavingPence(discount, itemPricePence);
    if (savingPence > 0 && (!best || savingPence > best.savingPence)) best = { discount, savingPence };
  }
  return best;
}
