import type { ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { brandSideMatches, labelMatchesVariant, type VariantSpec } from "@/lib/price-collection/variant-label";

// Nuxt 3 storefronts (e.g. Cuva Health) ship the page's data as `<script id="__NUXT_DATA__">`: one
// flat JSON array in which objects and arrays hold *indexes* of their values, not the values. Once
// resolved, the page's own product — the one whose slug is the page address's last segment — looks like
//   { slug: "tadalafil", name: "Tadalafil", brand: { name: "Generic" }, variants: [
//     { name: "5mg", is_out_of_stock: false, packages: [
//       { total_quantity: 28, price: 41.95, discounted_price: 34.95, multipack_discounted_price: null } ] } ] }
// The price charged is the multi-pack discount when there is one, else the discounted price, else
// the list price (the page's own JSON-LD quotes the discounted one).

type Package = { total_quantity?: unknown; price?: unknown; discounted_price?: unknown; multipack_discounted_price?: unknown };
type Variant = { name?: unknown; is_out_of_stock?: unknown; packages?: Package[] };
type Product = { slug?: unknown; name?: unknown; brand?: { name?: unknown }; variants?: Variant[] };

// Wrappers Nuxt's serializer puts around a value: ["Reactive", index] and friends.
const REFERENCE_WRAPPERS = new Set(["ShallowReactive", "Reactive", "Ref", "ShallowRef"]);

// Resolves the indexed payload into plain values. Shared and circular references resolve to the
// same object, so the walk below can't loop.
function resolvePayload(raw: unknown[]): unknown {
  const resolved = new Map<number, unknown>();
  function resolve(index: unknown): unknown {
    if (typeof index !== "number" || index < 0) return undefined;
    if (resolved.has(index)) return resolved.get(index);
    const value = raw[index];
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) {
      if (typeof value[0] === "string" && REFERENCE_WRAPPERS.has(value[0])) return resolve(value[1]);
      const list: unknown[] = [];
      resolved.set(index, list);
      for (const item of value) list.push(resolve(item));
      return list;
    }
    const record: Record<string, unknown> = {};
    resolved.set(index, record);
    for (const [key, item] of Object.entries(value)) record[key] = resolve(item);
    return record;
  }
  return resolve(0);
}

function findProduct(node: unknown, slug: string, visited = new Set<unknown>()): Product | undefined {
  if (!node || typeof node !== "object" || visited.has(node)) return undefined;
  visited.add(node);
  const record = node as Record<string, unknown>;
  if (record.slug === slug && Array.isArray(record.variants)) return record as Product;
  for (const value of Object.values(record)) {
    const found = findProduct(value, slug, visited);
    if (found) return found;
  }
  return undefined;
}

function positive(value: unknown) {
  return typeof value === "number" && value > 0 ? value : undefined;
}

export function pickNuxtPayloadPrice(html: string, matchedTokens: string[], variant: VariantSpec, sourceUrl: string): ScrapedPrice | undefined {
  const raw = html.match(/<script[^>]+id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  const slug = new URL(sourceUrl).pathname.split("/").filter(Boolean).pop();
  if (!raw || !slug) return undefined;
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return undefined;
  }
  const product = Array.isArray(payload) ? findProduct(resolvePayload(payload), slug) : undefined;
  if (!product || typeof product.name !== "string") return undefined;
  // "Generic" as the brand marks the generic side; a real brand name leads the product name.
  const brand = typeof product.brand?.name === "string" ? product.brand.name : "";
  const productName = /^generic$/i.test(brand) ? `Generic ${product.name}` : product.name;

  const matches: { itemPricePence: number; availability: ScrapedPrice["availability"]; evidence: string }[] = [];
  for (const entry of product.variants ?? []) {
    if (typeof entry.name !== "string") continue;
    for (const pack of entry.packages ?? []) {
      const price = positive(pack.multipack_discounted_price) ?? positive(pack.discounted_price) ?? positive(pack.price);
      if (price === undefined || typeof pack.total_quantity !== "number") continue;
      const label = `${productName} ${entry.name} ${pack.total_quantity} tablets`;
      if (!brandSideMatches(productName, "", matchedTokens[0], variant.generic)) continue;
      if (!labelMatchesVariant(label, matchedTokens, variant)) continue;
      const availability = ({ true: "OUT_OF_STOCK", false: "IN_STOCK" } as const)[String(entry.is_out_of_stock) as "true" | "false"] ?? "UNKNOWN";
      matches.push({ itemPricePence: Math.round(price * 100), availability, evidence: label });
    }
  }
  if (new Set(matches.map((match) => match.itemPricePence)).size !== 1) return undefined;
  return {
    ...matches[0],
    deliveryFeePence: 0,
    deliveryAssumption: "As shown on the provider's product page at collection time",
    sourceUrl,
    source: "nuxt-payload-variants",
  };
}
