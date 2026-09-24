// Decides whether a product label a site declares itself (a merchant-feed item title, a JSON-LD
// Product/Offer name) names exactly one variant: an ingredient/brand token, the variant's strength
// and its pack size. Deliberately conservative — a label quoting any other strength or pack size,
// or no pack size at all, is rejected rather than guessed at, so an ambiguous label falls through
// to the next collection step instead of saving a price for the wrong pack.

import type { Ingredient } from "@/generated/prisma/client";

export type VariantSpec = { strengthMg: number; packQuantity: number };

// Words a product page/label for this variant would use: its brand, then the ingredient's generic
// and best-known brand names.
export function variantTokens(variant: { ingredient: Ingredient; brandName: string | null }) {
  const tokenMap = {
    SILDENAFIL: ["sildenafil", "viagra"],
    TADALAFIL: ["tadalafil", "cialis"],
  } satisfies Record<Ingredient, string[]>;
  return [...new Set([...(variant.brandName ? [variant.brandName.toLowerCase()] : []), ...tokenMap[variant.ingredient]])];
}

const strengthPattern = /(\d{1,3}(?:\.\d+)?)\s*mg\b/g;
const quantityPatterns = [
  /\b(\d{1,3})\s*(?:x\s*)?(?:film[- ]coated\s+)?(?:tablets?|tabs?|pills?|capsules?|caps)\b/g,
  /(?:mg|\s|^)x\s?(\d{1,3})\b/g,
  /\b(?:pack|box)\s*(?:of|size)?\s*[:#-]?\s*(\d{1,3})\b/g,
  /\bqty\s*[:#-]?\s*(\d{1,3})\b/g,
  /\b(\d{1,3})\s*(?:pack|pk)\b/g,
];

export function labelMatchesVariant(label: string, tokens: string[], variant: VariantSpec): boolean {
  const text = label.toLowerCase().replace(/\s+/g, " ");
  if (!tokens.some((token) => text.includes(token.toLowerCase()))) return false;

  const strengths = [...text.matchAll(strengthPattern)].map((match) => Number(match[1]));
  if (strengths.length === 0 || strengths.some((strength) => strength !== variant.strengthMg)) return false;

  const quantities = quantityPatterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => Number(match[1])));
  return quantities.length > 0 && quantities.every((quantity) => quantity === variant.packQuantity);
}
