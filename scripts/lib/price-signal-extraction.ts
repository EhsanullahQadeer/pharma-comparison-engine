export type PriceVariant = {
  quantity: string;
  price: string | null;
  context: string;
};

export type PriceSignalExtraction = {
  pricesFound: string[];
  discountsFound: string[];
  variants: PriceVariant[];
  jsonLdOffers: unknown[];
};

const jsonLdScriptPattern = /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const pricePattern = /£\s?\d{1,4}(?:\.\d{2})?/g;
const quantityPattern = /(\d{1,3})\s*(tablets?|pills?|capsules?|caps?)/gi;
const discountPatterns = [
  /\d{1,3}%\s?off/gi,
  /save\s+£?\d+(?:\.\d{2})?/gi,
  /was\s+£?\d+(?:\.\d{2})?\s*now\s*£?\d+(?:\.\d{2})?/gi,
  /discount code/gi,
  /promo code/gi,
];
const offerTypes = new Set(["Product", "Offer", "AggregateOffer"]);

// Recursively walks a parsed JSON-LD value (object, array, or scalar) collecting any node whose
// @type matches a schema.org type we care about — a page can nest these inside @graph, arrays of
// offers, etc., so a flat top-level check isn't enough.
function collectJsonLdOffers(value: unknown, into: unknown[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdOffers(item, into);
    return;
  }
  if (!value || typeof value !== "object") return;
  const node = value as Record<string, unknown>;
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => typeof t === "string" && offerTypes.has(t))) into.push(node);
  for (const child of Object.values(node)) collectJsonLdOffers(child, into);
}

function extractJsonLdOffers(html: string): unknown[] {
  const offers: unknown[] = [];
  for (const match of html.matchAll(jsonLdScriptPattern)) {
    try {
      collectJsonLdOffers(JSON.parse(match[1]), offers);
    } catch {
      // Malformed JSON-LD block — skip it, other signals still apply.
    }
  }
  return offers;
}

function extractWithContext(html: string, pattern: RegExp, contextChars: number): string[] {
  const snippets = new Set<string>();
  for (const match of html.matchAll(pattern)) {
    const start = Math.max(0, (match.index ?? 0) - contextChars);
    const end = Math.min(html.length, (match.index ?? 0) + match[0].length + contextChars);
    snippets.add(html.slice(start, end).replace(/\s+/g, " ").trim());
  }
  return [...snippets];
}

// Most ED pharmacy product pages list several pack-size options (e.g. "4 tablets £24.99", "8
// tablets £39.99") rather than one single price — this pairs each quantity mention with the
// nearest price in its surrounding text so the output can report per-variant pricing, not just a
// flat list of every price found anywhere on the page.
function extractVariants(html: string): PriceVariant[] {
  const seen = new Set<string>();
  const variants: PriceVariant[] = [];
  for (const match of html.matchAll(quantityPattern)) {
    const start = Math.max(0, (match.index ?? 0) - 60);
    const end = Math.min(html.length, (match.index ?? 0) + match[0].length + 60);
    const context = html.slice(start, end).replace(/\s+/g, " ").trim();
    const price = context.match(pricePattern)?.[0] ?? null;
    const quantity = `${match[1]} ${match[2]}`;
    const key = `${quantity}|${price}`;
    if (seen.has(key)) continue;
    seen.add(key);
    variants.push({ quantity, price, context });
  }
  return variants;
}

// Best-effort, heuristic signal extraction over raw HTML — no delivered-total computation, no fee
// separation. This surfaces candidate prices/discounts for a human to review, not a final price.
export function extractPriceSignals(html: string): PriceSignalExtraction {
  const pricesFound = [...new Set([...html.matchAll(pricePattern)].map((match) => match[0]))];
  const discountsFound = discountPatterns.flatMap((pattern) => extractWithContext(html, pattern, 40));
  return {
    pricesFound,
    discountsFound: [...new Set(discountsFound)],
    variants: extractVariants(html),
    jsonLdOffers: extractJsonLdOffers(html),
  };
}
