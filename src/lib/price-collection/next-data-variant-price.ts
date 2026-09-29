import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// Next.js storefronts ship every strength/pack option in the page's `__NEXT_DATA__` JSON. Two shapes
// are read:
// - Magento-style catalogues (e.g. Mail My Meds): variant products with a descriptive SKU such as
//   "Viagra (Sildenafil)-Branded (Viagra)-50mg-4 Tablets", a price block
//   (`price.minimalPrice|regularPrice.amount.{currency,value}`) and `stock_status`. The SKU carries
//   the strength, pack and branded/generic side, so it is the label checked against the variant.
// - A Shopify product embedded whole (e.g. My Private Pharmacist, via its CMS): `title`, named
//   `options` ("Brand or Generic" / "Strength" / "Quantity") and `variants` whose `option1..3` hold
//   the chosen values ("Viagra (Brand)", "25mg", "4") with `price` as a GBP decimal string. A bare
//   count under a "Quantity"/"Pack" option is read as that many tablets.

type Money = { amount?: { currency?: unknown; value?: unknown } };
type VariantProduct = {
  sku?: unknown;
  stock_status?: unknown;
  price?: { minimalPrice?: Money; regularPrice?: Money };
};
type ShopifyProduct = {
  title?: unknown;
  options?: { name?: unknown }[];
  variants?: { price?: unknown; available?: unknown; option1?: unknown; option2?: unknown; option3?: unknown }[];
};
type PricedLabel = { productName: string; optionText: string; label: string; itemPricePence: number; availability: ScrapedPrice["availability"] };

function readNextData(html: string): unknown {
  const raw = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// Every object shaped like a priced variant product or a Shopify product, wherever the page nests it.
function collectProducts(node: unknown, found: { magento: VariantProduct[]; shopify: ShopifyProduct[] } = { magento: [], shopify: [] }) {
  if (Array.isArray(node)) {
    for (const item of node) collectProducts(item, found);
  } else if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (typeof record.sku === "string" && record.price && typeof record.price === "object") found.magento.push(record as VariantProduct);
    if (typeof record.title === "string" && Array.isArray(record.options) && Array.isArray(record.variants)) found.shopify.push(record as ShopifyProduct);
    for (const value of Object.values(record)) collectProducts(value, found);
  }
  return found;
}

const stock = { IN_STOCK: "IN_STOCK", OUT_OF_STOCK: "OUT_OF_STOCK" } as const;
// Shopify's `available` flag; absent (as on My Private Pharmacist) means unknown.
const availableFlag = { true: "IN_STOCK", false: "OUT_OF_STOCK" } as const;

function magentoLabels(products: VariantProduct[]): PricedLabel[] {
  const labels: PricedLabel[] = [];
  const seen = new Set<string>();
  for (const product of products) {
    const sku = String(product.sku);
    if (seen.has(sku)) continue;
    seen.add(sku);
    const money = product.price?.minimalPrice?.amount ?? product.price?.regularPrice?.amount;
    if (money?.currency !== "GBP" || typeof money.value !== "number" || !(money.value > 0)) continue;
    // The SKU starts with the product name and usually states "Branded (…)" / "Generic (…)".
    labels.push({
      productName: sku,
      optionText: sku,
      label: sku.replace(/-/g, " "),
      itemPricePence: Math.round(money.value * 100),
      availability: stock[String(product.stock_status) as keyof typeof stock] ?? "UNKNOWN",
    });
  }
  return labels;
}

function shopifyLabels(products: ShopifyProduct[]): PricedLabel[] {
  const labels: PricedLabel[] = [];
  for (const product of products) {
    const optionNames = (product.options ?? []).map((option) => String(option.name ?? ""));
    for (const entry of product.variants ?? []) {
      const price = typeof entry.price === "string" && /^\d+(?:\.\d{1,2})?$/.test(entry.price) ? Number(entry.price) : NaN;
      if (!(price > 0)) continue;
      const values = [entry.option1, entry.option2, entry.option3]
        .map((value, index) => ({ name: optionNames[index] ?? "", value: typeof value === "string" ? value.trim() : "" }))
        .filter(({ value }) => value);
      const optionText = values
        // "4" or "28 (4 week)" under a Quantity option → "4 tablets" / "28 tablets (4 week)".
        .map(({ name, value }) => (/\b(?:quantity|qty|pack)/i.test(name) ? value.replace(/^(\d{1,3})(?=\s*(?:\(|$))/, "$1 tablets") : value))
        .join(" / ");
      labels.push({
        productName: String(product.title),
        optionText,
        label: `${product.title} ${optionText}`,
        itemPricePence: Math.round(price * 100),
        availability: availableFlag[String(entry.available) as keyof typeof availableFlag] ?? "UNKNOWN",
      });
    }
  }
  return labels;
}

export function pickNextDataVariantPrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const data = readNextData(html);
  if (!data) return undefined;
  const { magento, shopify } = collectProducts(data);
  const matches = [...magentoLabels(magento), ...shopifyLabels(shopify)]
    .filter((item) => brandSideMatches(item.productName, item.optionText, matchedTokens[0], variant.generic))
    .filter((item) => labelMatchesVariant(item.label, matchedTokens, variant));
  if (new Set(matches.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    itemPricePence: matches[0].itemPricePence,
    availability: matches[0].availability,
    evidence: matches[0].label,
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    sourceUrl,
    source: "next-data-variants",
  };
}
