import { extractEmbeddedJson } from "@/lib/price-collection/embedded-json";
import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// Shopify storefronts (e.g. Your Medicals, EveryDayMeds, 365 Pharmacist, 121 Pharmacy) embed the
// product's variants in the page's analytics object `var meta = {"product": {"variants": [...]}}`,
// each with a full `name` ("Viagra Tablets (Branded Sildenafil) - 50mg / 4 Tablets"), a
// `public_title` ("50mg / 4 Tablets") and `price` in pence — the list price, before any discount code.

type MetaVariant = { name?: unknown; public_title?: unknown; price?: unknown };

export function pickShopifyMetaPrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const meta = extractEmbeddedJson(html, /var\s+meta\s*=/) as { product?: { variants?: MetaVariant[] } } | undefined;
  const variants = meta?.product?.variants;
  if (!Array.isArray(variants) || variants.length === 0) return undefined;

  const matches: { itemPricePence: number; evidence: string }[] = [];
  for (const entry of variants) {
    if (typeof entry.name !== "string" || typeof entry.price !== "number" || entry.price <= 0) continue;
    const option = typeof entry.public_title === "string" ? entry.public_title : "";
    // The product title is the name without its " - <option>" suffix.
    const productTitle = option && entry.name.endsWith(` - ${option}`) ? entry.name.slice(0, -(option.length + 3)) : entry.name;
    if (!brandSideMatches(productTitle, option, matchedTokens[0], variant.generic)) continue;
    if (!labelMatchesVariant(entry.name, matchedTokens, variant)) continue;
    matches.push({ itemPricePence: Math.round(entry.price), evidence: entry.name });
  }
  if (new Set(matches.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    ...matches[0],
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    availability: "UNKNOWN",
    sourceUrl,
    source: "shopify-product-meta",
  };
}
