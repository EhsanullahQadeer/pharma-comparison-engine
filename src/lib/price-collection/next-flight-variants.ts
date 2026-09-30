import { extractEmbeddedJson } from "@/lib/price-collection/embedded-json";
import type { PricedVariantLabel } from "@/types/pricing";

// Next.js App Router storefronts have no `__NEXT_DATA__`: the page's data streams in
// `self.__next_f.push([1,"…"])` script chunks (a JSON-escaped string each). The page's own product
// is found by its slug — the page address's last segment — because the stream can also carry
// related products. Two variant shapes are read:
// - Pharmacy Online: `"slug":"viagra","title":"Viagra","variants":[{ "price":2499 (pence),
//   "units_available":9999, "attributes":[{"attribute_name":"Strength","attribute_value":"25mg"},
//   {"attribute_name":"Pack Size","attribute_value":"4"}], "sale_price"… }]`
// - SynovaMed: `"slug":"cialis-together","name":"Cialis Together",…,"variants":[{ "name":"10mg - 4 Tablets",
//   "price":{"currency":"GBP","amount":1999}, "oneOffPrice":{…}, "inStock":false, "strength":"10mg",
//   "packSize":"4" }]` — the one-off price, never a subscription price.

type Money = { currency?: unknown; amount?: unknown };
type FlightVariant = {
  price?: unknown;
  oneOffPrice?: Money;
  sale_price?: unknown;
  sale_start_date?: unknown;
  sale_end_date?: unknown;
  units_available?: unknown;
  inStock?: unknown;
  is_active?: unknown;
  is_bundle?: unknown;
  deleted_at?: unknown;
  strength?: unknown;
  packSize?: unknown;
  attributes?: { attribute_name?: unknown; attribute_value?: unknown }[];
};

function readFlightStream(html: string): string {
  let stream = "";
  for (const chunk of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) {
    try {
      stream += JSON.parse(chunk[1]) as string;
    } catch {
      // A chunk that isn't a plain string; the rest of the stream is still usable.
    }
  }
  return stream;
}

// "$D2026-01-28T20:32:02.171Z" is how the stream encodes a date.
function flightDate(value: unknown) {
  return typeof value === "string" ? new Date(value.replace(/^\$D/, "")) : undefined;
}

// Pence, from a bare number or a `{currency, amount}` block (GBP only).
function pence(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  const money = value as Money | null;
  return money && typeof money === "object" && money.currency === "GBP" && typeof money.amount === "number" ? money.amount : undefined;
}

// The one-off price; a sale price only while its window is open.
function pricePence(entry: FlightVariant, now: Date) {
  const start = flightDate(entry.sale_start_date);
  const end = flightDate(entry.sale_end_date);
  const onSale = typeof entry.sale_price === "number" && entry.sale_price > 0 && (!start || start <= now) && (!end || end >= now);
  if (onSale) return entry.sale_price as number;
  return pence(entry.oneOffPrice) ?? pence(entry.price);
}

function strengthAndPack(entry: FlightVariant) {
  const attributes = new Map((entry.attributes ?? []).map((attribute) => [String(attribute.attribute_name).toLowerCase(), String(attribute.attribute_value)]));
  const strength = typeof entry.strength === "string" ? entry.strength : attributes.get("strength");
  const pack = typeof entry.packSize === "string" ? entry.packSize : attributes.get("pack size") ?? attributes.get("quantity");
  return { strength, pack };
}

function availability(entry: FlightVariant): PricedVariantLabel["availability"] {
  if (typeof entry.inStock === "boolean") return entry.inStock ? "IN_STOCK" : "OUT_OF_STOCK";
  if (typeof entry.units_available === "number") return entry.units_available > 0 ? "IN_STOCK" : "OUT_OF_STOCK";
  return "UNKNOWN";
}

// The page's own product: its slug, then its name/title and variants before any other product's slug.
function pageProduct(stream: string, slug: string) {
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const at = stream.search(new RegExp(`"slug":"${escapedSlug}"`));
  if (at < 0) return undefined;
  const rest = stream.slice(at + 1);
  const next = rest.search(/"slug":"/);
  const own = next < 0 ? rest : rest.slice(0, next);
  const variantsAt = own.indexOf("\"variants\":[");
  const name = own.match(/"(?:title|name)":("(?:[^"\\]|\\.)*")/)?.[1];
  if (variantsAt < 0 || !name) return undefined;
  const variants = extractEmbeddedJson(rest.slice(variantsAt), /"variants":/);
  return Array.isArray(variants) ? { title: JSON.parse(name) as string, variants: variants as FlightVariant[] } : undefined;
}

export function flightStreamLabels(html: string, sourceUrl: string): PricedVariantLabel[] {
  const stream = readFlightStream(html);
  const slug = new URL(sourceUrl).pathname.split("/").filter(Boolean).pop();
  const product = stream && slug ? pageProduct(stream, slug) : undefined;
  if (!product) return [];
  const now = new Date();
  return product.variants.flatMap((entry) => {
    if (entry.is_active === false || entry.is_bundle === true || entry.deleted_at) return [];
    const amount = pricePence(entry, now);
    const { strength, pack } = strengthAndPack(entry);
    if (typeof amount !== "number" || !(amount > 0) || !strength || !pack) return [];
    const optionText = `${strength} / ${/^\d{1,3}$/.test(pack) ? `${pack} tablets` : pack}`;
    return [{ productName: product.title, optionText, label: `${product.title} ${optionText}`, itemPricePence: Math.round(amount), availability: availability(entry) }];
  });
}
