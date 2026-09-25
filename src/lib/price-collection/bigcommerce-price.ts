import { extractEmbeddedJson } from "@/lib/price-collection/embedded-json";
import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// BigCommerce storefronts (e.g. Well Pharmacy) embed the product's current price and stock as
// `var BCData = {...}` in every product page, whether or not they publish JSON-LD. BCData carries
// no product name, so the page's own product title has to name the exact variant — the same
// conservative label check the feed and JSON-LD steps use — before its price is accepted.

type BcMoney = { value?: unknown; currency?: unknown };
type BcData = {
  product_attributes?: {
    price?: { with_tax?: BcMoney; without_tax?: BcMoney };
    instock?: unknown;
  };
};

function extractBcData(html: string): BcData | undefined {
  const data = extractEmbeddedJson(html, /var\s+BCData\s*=/);
  return data && typeof data === "object" && !Array.isArray(data) ? (data as BcData) : undefined;
}

function decodeEntities(text: string) {
  return text.replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();
}

function productTitle(html: string): string {
  const heading = html.match(/<h1[^>]*class="[^"]*productView-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return decodeEntities((heading ?? ogTitle ?? title ?? "").replace(/<[^>]+>/g, " "));
}

export function pickBigCommercePrice(html: string, matchedTokens: string[], variant: VariantSpec | undefined, sourceUrl: string): ScrapedPrice | undefined {
  const attributes = extractBcData(html)?.product_attributes;
  const money = attributes?.price?.with_tax ?? attributes?.price?.without_tax;
  if (!money || money.currency !== "GBP" || typeof money.value !== "number" || !Number.isFinite(money.value) || money.value <= 0) return undefined;

  const title = productTitle(html);
  const titleMatches = variant
    ? labelMatchesVariant(title, matchedTokens, variant)
    : matchedTokens.length === 0 || matchedTokens.some((token) => title.toLowerCase().includes(token.toLowerCase()));
  if (!titleMatches || (variant && !brandSideMatches(title, "", matchedTokens[0], variant.generic))) return undefined;

  const availabilityByStock = { true: "IN_STOCK", false: "OUT_OF_STOCK" } as const;
  return {
    itemPricePence: Math.round(money.value * 100),
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    availability: typeof attributes?.instock === "boolean" ? availabilityByStock[`${attributes.instock}`] : "UNKNOWN",
    sourceUrl,
    evidence: title,
    source: "bigcommerce-page-data",
  };
}
