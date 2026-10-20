import { filterOffers } from "@/lib/comparison";
import type { ComparisonFilters, EdProduct, PublicOffer } from "@/types/comparison";

const PRICE_SCOPE = "from registered UK pharmacies, by strength and pack size, with delivery and consultation costs added in.";
const PRESCRIBER_DECIDES = "The pharmacy's own prescriber decides whether it is suitable for you.";
const PHARMACIST_CHECKS = "It is sold without a prescription after a pharmacist has checked it is suitable for you.";

// Copy here is factual only (what the product is, its legal class, what the page lists). No claims
// about how well a product works and no comparisons between products: prescription-only medicines
// must not be promoted to the public.
export const edProducts: EdProduct[] = [
  {
    slug: "viagra",
    name: "Viagra",
    ingredient: "SILDENAFIL",
    typeSlug: "viagra",
    prescriptionOnly: true,
    description: `Prices for branded Viagra (sildenafil) ${PRICE_SCOPE}`,
    legalNote: `Viagra is a prescription-only medicine. ${PRESCRIBER_DECIDES}`,
  },
  {
    slug: "viagra-connect",
    name: "Viagra Connect",
    ingredient: "SILDENAFIL",
    typeSlug: "viagra-connect",
    prescriptionOnly: false,
    description: `Prices for Viagra Connect (sildenafil 50mg) ${PRICE_SCOPE}`,
    legalNote: `Viagra Connect is a pharmacy medicine. ${PHARMACIST_CHECKS}`,
  },
  {
    slug: "generic-sildenafil",
    name: "Generic sildenafil",
    ingredient: "SILDENAFIL",
    typeSlug: "generic",
    prescriptionOnly: true,
    description: `Prices for generic (unbranded) sildenafil ${PRICE_SCOPE}`,
    legalNote: `The generic sildenafil listed here is prescription-only. ${PRESCRIBER_DECIDES}`,
  },
  {
    slug: "cialis",
    name: "Cialis",
    ingredient: "TADALAFIL",
    typeSlug: "cialis",
    prescriptionOnly: true,
    description: `Prices for branded Cialis (tadalafil), including daily-dose packs, ${PRICE_SCOPE}`,
    legalNote: `Cialis is a prescription-only medicine. ${PRESCRIBER_DECIDES}`,
  },
  {
    slug: "cialis-together",
    name: "Cialis Together",
    ingredient: "TADALAFIL",
    typeSlug: "cialis-together",
    prescriptionOnly: false,
    description: `Prices for Cialis Together (tadalafil 10mg) ${PRICE_SCOPE}`,
    legalNote: `Cialis Together is a pharmacy medicine. ${PHARMACIST_CHECKS}`,
  },
  {
    slug: "generic-tadalafil",
    name: "Generic tadalafil",
    ingredient: "TADALAFIL",
    typeSlug: "generic",
    prescriptionOnly: true,
    description: `Prices for generic (unbranded) tadalafil, including daily-dose packs, ${PRICE_SCOPE}`,
    legalNote: `The generic tadalafil listed here is prescription-only. ${PRESCRIBER_DECIDES}`,
  },
];

export const productPath = (product: EdProduct) => `prices/${product.slug}`;

export function productOffers(offers: PublicOffer[], product: EdProduct) {
  return filterOffers(offers, { ingredient: product.ingredient, productType: product.typeSlug, sort: "tablet" });
}

// The product the compare page's grid shows: the one the URL names, else — within the URL's
// medicine, if any — the product with the most prices.
export function gridProduct(offers: PublicOffer[], { ingredient, productType }: Pick<ComparisonFilters, "ingredient" | "productType">) {
  const named = edProducts.find((product) => product.ingredient === ingredient && product.typeSlug === productType);
  if (named) return named;
  const candidates = edProducts.filter((product) => !ingredient || product.ingredient === ingredient);
  return [...candidates].sort((a, b) => productOffers(offers, b).length - productOffers(offers, a).length)[0] ?? edProducts[0];
}
