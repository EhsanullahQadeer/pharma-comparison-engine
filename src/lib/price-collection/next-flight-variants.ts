import { extractEmbeddedJson } from "@/lib/price-collection/embedded-json";
import type { PricedVariantLabel } from "@/types/pricing";

// Next.js App Router storefronts have no `__NEXT_DATA__`: the page's data streams in
// `self.__next_f.push([1,"…"])` script chunks (a JSON-escaped string each). The page's own product
// is found by its slug — the page address's last segment — because the stream can also carry
// related products. Three variant shapes are read:
// - Pharmacy Online: `"slug":"viagra","title":"Viagra","variants":[{ "price":2499 (pence),
//   "units_available":9999, "attributes":[{"attribute_name":"Strength","attribute_value":"25mg"},
//   {"attribute_name":"Pack Size","attribute_value":"4"}], "sale_price"… }]`
// - SynovaMed: `"slug":"cialis-together","name":"Cialis Together",…,"variants":[{ "name":"10mg - 4 Tablets",
//   "price":{"currency":"GBP","amount":1999}, "oneOffPrice":{…}, "inStock":false, "strength":"10mg",
//   "packSize":"4" }]` — the one-off price, never a subscription price.
// - The Independent Pharmacy: `"slug":"cialis-once-daily-tablets","title":…,"variants":[{
//   "name":"Cialis 5mg Tablets", "pack_size":"28 tablets", "available":true,
//   "quantities":[{"quantity":1,"price":8799},{"quantity":2,"price":15598}] }]` — packs × pack size.

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
  name?: unknown;
  pack_size?: unknown;
  available?: unknown;
  public?: unknown;
  quantities?: { quantity?: unknown; price?: unknown }[];
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

// Index of the quote closing the JSON string that opens at `open`.
function stringEnd(text: string, open: number) {
  let index = open + 1;
  while (index < text.length && text[index] !== "\"") index += text[index] === "\\" ? 2 : 1;
  return index;
}

// Reads the rest of the object a slug sits in, from just after the slug: nested objects and arrays
// are stepped over, so only that object's own `title`/`name` and `variants` count — never a nested
// slug's (the product's condition) or a sibling product's. The variants may also sit directly
// beside the product object in its parent (The Independent Pharmacy:
// `{"treatment":{slug,title,…},"variants":[…]}`), so the scan continues one level up, where only
// the parent's own keys count. Undefined when the parent closes without variants.
function readOwnProduct(stream: string, start: number) {
  let depth = 0;
  // The level whose keys count: 0 inside the product object, -1 once it has closed.
  let level = 0;
  let title = "";
  for (let index = start; index < stream.length; index += 1) {
    const char = stream[index];
    if (char === "\"") {
      const end = stringEnd(stream, index);
      const key = depth === level && stream[end + 1] === ":" ? stream.slice(index + 1, end) : "";
      if (key === "variants") {
        const variants = extractEmbeddedJson(stream.slice(index), /"variants":/);
        return Array.isArray(variants) ? { title, variants: variants as FlightVariant[] } : undefined;
      }
      if (level === 0 && (key === "title" || key === "name") && !title && stream[end + 2] === "\"") {
        title = JSON.parse(stream.slice(end + 2, stringEnd(stream, end + 2) + 1)) as string;
      }
      index = end;
    } else if (char === "{" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth < -1) return undefined;
      level = Math.min(level, depth);
    }
  }
  return undefined;
}

// The page's own product: the first object carrying the page's slug that also has variants (the
// slug alone can appear earlier in a menu or breadcrumb entry).
function pageProduct(stream: string, slug: string) {
  const marker = `"slug":${JSON.stringify(slug)}`;
  for (let at = stream.indexOf(marker); at >= 0; at = stream.indexOf(marker, at + 1)) {
    const product = readOwnProduct(stream, at + marker.length);
    if (product) return product;
  }
  return undefined;
}

// The Independent Pharmacy: a variant per strength, sold as 1, 2 or 3 packs — the tablet count is
// packs × the pack size ("28 tablets"), each with its own total price in pence.
function packQuantityLabels(entry: FlightVariant): PricedVariantLabel[] {
  const packSize = Number(String(entry.pack_size ?? "").match(/\d{1,3}/)?.[0]);
  if (typeof entry.name !== "string" || !(packSize > 0) || entry.public === false) return [];
  const name = entry.name;
  const stock = ({ true: "IN_STOCK", false: "OUT_OF_STOCK" } as const)[String(entry.available) as "true" | "false"] ?? "UNKNOWN";
  return (entry.quantities ?? []).flatMap((option) => {
    if (typeof option.quantity !== "number" || typeof option.price !== "number" || !(option.price > 0)) return [];
    return [{ productName: name, optionText: "", label: `${name} ${packSize * option.quantity} tablets`, itemPricePence: Math.round(option.price), availability: stock }];
  });
}

export function flightStreamLabels(html: string, sourceUrl: string): PricedVariantLabel[] {
  const stream = readFlightStream(html);
  const slug = new URL(sourceUrl).pathname.split("/").filter(Boolean).pop();
  const product = stream && slug ? pageProduct(stream, slug) : undefined;
  if (!product) return [];
  const now = new Date();
  return product.variants.flatMap((entry) => {
    if (entry.is_active === false || entry.is_bundle === true || entry.deleted_at) return [];
    if (Array.isArray(entry.quantities)) return packQuantityLabels(entry);
    if (!product.title) return [];
    const amount = pricePence(entry, now);
    const { strength, pack } = strengthAndPack(entry);
    if (typeof amount !== "number" || !(amount > 0) || !strength || !pack) return [];
    const optionText = `${strength} / ${/^\d{1,3}$/.test(pack) ? `${pack} tablets` : pack}`;
    return [{ productName: product.title, optionText, label: `${product.title} ${optionText}`, itemPricePence: Math.round(amount), availability: availability(entry) }];
  });
}
