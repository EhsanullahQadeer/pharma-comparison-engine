import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// Next.js storefronts on a Magento-style catalogue (e.g. Mail My Meds) ship every strength/pack
// option in the page's `__NEXT_DATA__` JSON as product variants: a descriptive SKU such as
// "Viagra (Sildenafil)-Branded (Viagra)-50mg-4 Tablets", a price block
// (`price.minimalPrice|regularPrice.amount.{currency,value}`) and `stock_status`. The SKU carries the
// strength, pack and branded/generic side, so it is the label checked against the exact variant.

type Money = { amount?: { currency?: unknown; value?: unknown } };
type VariantProduct = {
  sku?: unknown;
  stock_status?: unknown;
  price?: { minimalPrice?: Money; regularPrice?: Money };
};

function readNextData(html: string): unknown {
  const raw = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// Every object shaped like a priced variant product, wherever the page nests it.
function collectVariantProducts(node: unknown, found: VariantProduct[] = []): VariantProduct[] {
  if (Array.isArray(node)) {
    for (const item of node) collectVariantProducts(item, found);
  } else if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (typeof record.sku === "string" && record.price && typeof record.price === "object") found.push(record as VariantProduct);
    for (const value of Object.values(record)) collectVariantProducts(value, found);
  }
  return found;
}

export function pickNextDataVariantPrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const data = readNextData(html);
  if (!data) return undefined;
  const matches: { itemPricePence: number; availability: ScrapedPrice["availability"]; evidence: string }[] = [];
  const seen = new Set<string>();
  for (const product of collectVariantProducts(data)) {
    const sku = String(product.sku);
    if (seen.has(sku)) continue;
    seen.add(sku);
    // The SKU starts with the product name and usually states "Branded (…)" / "Generic (…)".
    if (!brandSideMatches(sku, sku, matchedTokens[0], variant.generic)) continue;
    if (!labelMatchesVariant(sku.replace(/-/g, " "), matchedTokens, variant)) continue;
    const money = product.price?.minimalPrice?.amount ?? product.price?.regularPrice?.amount;
    if (money?.currency !== "GBP" || typeof money.value !== "number" || !(money.value > 0)) continue;
    const stock = { IN_STOCK: "IN_STOCK", OUT_OF_STOCK: "OUT_OF_STOCK" } as const;
    matches.push({
      itemPricePence: Math.round(money.value * 100),
      availability: stock[String(product.stock_status) as keyof typeof stock] ?? "UNKNOWN",
      evidence: sku,
    });
  }
  if (new Set(matches.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    ...matches[0],
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    sourceUrl,
    source: "next-data-variants",
  };
}
