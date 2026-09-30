// Decides whether a product label a site declares itself (a merchant-feed item title, a JSON-LD
// Product/Offer name) names exactly one variant: an ingredient/brand token, the variant's strength
// and its pack size. Deliberately conservative — a label quoting any other strength or pack size,
// or no pack size at all, is rejected rather than guessed at, so an ambiguous label falls through
// to the next collection step instead of saving a price for the wrong pack.

import type { Ingredient } from "@/generated/prisma/client";

// `generic`: the catalogue variant is a generic (its formulation says so); when known, readers that
// can tell branded from generic packs apart (e.g. a shared WooCommerce dropdown) keep only that side.
export type VariantSpec = { strengthMg: number; packQuantity: number; generic?: boolean };

export function isGenericFormulation(formulation: string) {
  return /generic/i.test(formulation);
}

// Whether a shop's product (name + chosen option text) is on the branded or generic side the catalogue
// variant needs. Option text that says so decides ("Viagra (Branded) 50mg" / "Sildenafil (Generic)",
// "…-Branded (Viagra)-…"); otherwise the product name does: one that starts with the brand
// ("Viagra (Sildenafil) Tablets") is branded, anything else ("Sildenafil (Viagra) Tablets",
// "Tadalafil (Generic Cialis)") is generic — a brand in brackets only describes a generic.
// `brand` is tokens[0] when the variant has a brand name (see variantTokens).
export function brandSideMatches(productName: string, optionText: string, brand: string | undefined, generic: boolean | undefined) {
  if (generic === undefined || !brand) return true;
  const options = optionText.toLowerCase();
  const name = productName.trim().toLowerCase();
  const genericLabel = /generic/.test(options) || (!/branded/.test(options) && /generic/.test(name));
  const brandedLabel = /branded/.test(options) || (!genericLabel && (options.includes(brand.toLowerCase()) || name.startsWith(brand.toLowerCase())));
  return generic ? genericLabel || !brandedLabel : brandedLabel && !genericLabel;
}

// When one page lists both the prescription brand and its over-the-counter version (Viagra and Viagra
// Connect, Cialis and Cialis Together) for the same strength and pack, the catalogue's branded
// product is the prescription one — keep those labels whenever any are present.
export function preferPrescriptionLabels<T>(items: T[], label: (item: T) => string): T[] {
  const prescription = items.filter((item) => !/\b(connect|together)\b/i.test(label(item)));
  return prescription.length > 0 ? prescription : items;
}

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
  // Count before strength: "Viagra Tablets 4 x 25mg" (Pharmulous).
  /\b(\d{1,3})\s*x\s*\d{1,3}(?:\.\d+)?\s*mg\b/g,
  // Count in brackets after the form: "Perrigo Sildenafil 50mg Film-Coated Tablets (4)" (Oxford e-Pharmacy).
  /\b(?:tablets?|capsules?)\s*\((\d{1,3})\)/g,
  /\b(?:pack|box)\s*(?:of|size)?\s*[:#-]?\s*(\d{1,3})\b/g,
  /\bqty\s*[:#-]?\s*(\d{1,3})\b/g,
  /\b(\d{1,3})\s*(?:pack|pk)\b/g,
];

// Over-the-counter products licensed in a single strength, which shops often name without it
// ("Viagra Connect 4 Tablets"). Only used when the label states no strength at all.
const singleStrengthProducts = { "viagra connect": 50, "cialis together": 10 } as const;

function impliedStrength(text: string): number[] {
  const product = (Object.keys(singleStrengthProducts) as (keyof typeof singleStrengthProducts)[]).find((name) => text.includes(name));
  return product ? [singleStrengthProducts[product]] : [];
}

// An over-the-counter product is never its prescription brand, either way round: text naming "Viagra
// Connect" can't price prescription Viagra, nor text naming plain "Viagra" Viagra Connect.
export function otcProductMismatch(text: string, tokens: string[]): boolean {
  const lower = text.toLowerCase().replace(/\s+/g, " ");
  const variantNames = tokens.map((token) => token.toLowerCase());
  return Object.keys(singleStrengthProducts).some((name) => lower.includes(name) !== variantNames.includes(name));
}

export function labelMatchesVariant(label: string, tokens: string[], variant: VariantSpec): boolean {
  const text = label.toLowerCase().replace(/\s+/g, " ");
  if (!tokens.some((token) => text.includes(token.toLowerCase()))) return false;
  if (otcProductMismatch(text, tokens)) return false;

  const stated = [...text.matchAll(strengthPattern)].map((match) => Number(match[1]));
  const strengths = stated.length > 0 ? stated : impliedStrength(text);
  if (strengths.length === 0 || strengths.some((strength) => strength !== variant.strengthMg)) return false;

  const quantities = quantityPatterns.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => Number(match[1])));
  return quantities.length > 0 && quantities.every((quantity) => quantity === variant.packQuantity);
}
