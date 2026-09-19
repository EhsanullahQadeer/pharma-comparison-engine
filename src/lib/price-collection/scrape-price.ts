import { collectPublicWebsite } from "@/lib/discovery/public-web";

export type ScrapedPrice = {
  itemPricePence: number;
  deliveryFeePence: number;
  deliveryAssumption: string;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
  sourceUrl: string;
};

// Regex-based extraction, not a DOM parser — only ever need <script type="application/ld+json">
// contents, same lightweight approach as extractPageTitle in public-web-policy.ts.
function extractJsonLdBlocks(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [];
  for (const match of html.matchAll(/<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed: unknown = JSON.parse(match[1].trim());
      for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
        if (node && typeof node === "object") blocks.push(node as Record<string, unknown>);
      }
    } catch {
      // Malformed JSON-LD on this block — other blocks on the page may still be usable.
    }
  }
  return blocks;
}

function hasType(node: Record<string, unknown>, type: string): boolean {
  const value = node["@type"];
  return Array.isArray(value) ? value.includes(type) : value === type;
}

function toPence(value: unknown): number | undefined {
  let num: number | undefined;
  if (typeof value === "string") num = Number(value);
  else if (typeof value === "number") num = value;
  if (num === undefined || !Number.isFinite(num) || num < 0) return undefined;
  return Math.round(num * 100);
}

const availabilityMap: Record<string, "IN_STOCK" | "OUT_OF_STOCK"> = {
  "http://schema.org/InStock": "IN_STOCK",
  "https://schema.org/InStock": "IN_STOCK",
  "http://schema.org/OutOfStock": "OUT_OF_STOCK",
  "https://schema.org/OutOfStock": "OUT_OF_STOCK",
};

// Reads a real schema.org Product/Offer block from the page's own structured data — the "treat
// structured markup as evidence to validate" approach from docs/milestone-05-scraping-research-
// review.md, not a guess parsed out of arbitrary body text. Live-verified against
// clickpharmacy.co.uk (real GBP price + a DeliveryChargeSpecification). Deliberately rejects
// anything not priced in GBP rather than trust it — live-verified treated.com's own Product/Offer
// markup reports USD on this page, which would be a wrong price if accepted silently.
export async function scrapeProductPrice(url: string): Promise<ScrapedPrice> {
  const page = await collectPublicWebsite(url);
  const blocks = extractJsonLdBlocks(page.html);

  for (const block of blocks) {
    if (!hasType(block, "Product")) continue;

    const offers = block.offers;
    const offer = Array.isArray(offers) ? offers[0] : offers;
    if (!offer || typeof offer !== "object") continue;
    const offerNode = offer as Record<string, unknown>;

    if (offerNode.priceCurrency !== "GBP") continue;

    const itemPricePence = toPence(offerNode.price);
    if (itemPricePence === undefined) continue;

    const priceSpecRaw = offerNode.priceSpecification;
    const priceSpec = (Array.isArray(priceSpecRaw) ? priceSpecRaw[0] : priceSpecRaw) as Record<string, unknown> | undefined;

    let deliveryFeePence = 0;
    let deliveryAssumption = "As shown on the provider's product page at collection time";
    if (priceSpec && hasType(priceSpec, "DeliveryChargeSpecification") && priceSpec.priceCurrency === "GBP") {
      deliveryFeePence = toPence(priceSpec.price) ?? 0;
      if (typeof priceSpec.name === "string") deliveryAssumption = priceSpec.name;
    }

    const availability = typeof offerNode.availability === "string" ? (availabilityMap[offerNode.availability] ?? "UNKNOWN") : "UNKNOWN";

    return { itemPricePence, deliveryFeePence, deliveryAssumption, availability, sourceUrl: page.finalUrl };
  }

  throw new Error("No GBP product price found in this page's structured data. Review it manually.");
}
