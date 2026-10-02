import assert from "node:assert/strict";
import test from "node:test";

import { pickNuxtPayloadPrice } from "./nuxt-payload-price";

// Flattens a value the way Nuxt's payload is stored: one array, objects/arrays holding indexes.
function flatten(root: unknown): unknown[] {
  const out: unknown[] = [];
  function add(value: unknown): number {
    const index = out.length;
    out.push(null);
    if (Array.isArray(value)) out[index] = value.map(add);
    else if (value && typeof value === "object") out[index] = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, add(item)]));
    else out[index] = value;
    return index;
  }
  add(root);
  return out;
}

const pack = (total_quantity: number, price: number, discounted_price: number | null, multipack_discounted_price: number | null) => ({ total_quantity, price, discounted_price, multipack_discounted_price });

// Trimmed from Cuva Health's tadalafil page; a related product sits in the same payload.
const tadalafil = {
  slug: "tadalafil",
  name: "Tadalafil",
  brand: { name: "Generic", slug: "generic" },
  treatment: { name: "Erectile Dysfunction", slug: "erectile-dysfunction" },
  variants: [
    { name: "5mg", is_out_of_stock: false, packages: [pack(28, 41.95, 34.95, null), pack(56, 83.95, null, 69.95)] },
    { name: "10mg", is_out_of_stock: true, packages: [pack(4, 24.95, 19.95, null), pack(8, 48.95, null, 29.95)] },
  ],
};
const sildenafil = { slug: "sildenafil", name: "Sildenafil", brand: { name: "Generic" }, variants: [{ name: "50mg", is_out_of_stock: false, packages: [pack(4, 11.95, 9.95, null)] }] };
const page = (root: unknown) => `<script type="application/json" data-nuxt-data="nuxt-app" id="__NUXT_DATA__">${JSON.stringify(flatten(root))}</script>`;
const html = page({ data: { related: [sildenafil], "product-tadalafil": { data: tadalafil } } });
const url = "https://cuvahealth.co.uk/product/tadalafil";
const tokens = ["cialis", "tadalafil"];

test("reads the page's own product from the indexed payload, at the price actually charged", () => {
  const daily = pickNuxtPayloadPrice(html, tokens, { strengthMg: 5, packQuantity: 28, generic: true }, url);
  assert.equal(daily?.itemPricePence, 3495);
  assert.equal(daily?.availability, "IN_STOCK");
  // The multi-pack discount is the price for a multi-pack.
  assert.equal(pickNuxtPayloadPrice(html, tokens, { strengthMg: 5, packQuantity: 56, generic: true }, url)?.itemPricePence, 6995);
  const onDemand = pickNuxtPayloadPrice(html, tokens, { strengthMg: 10, packQuantity: 4, generic: true }, url);
  assert.equal(onDemand?.itemPricePence, 1995);
  assert.equal(onDemand?.availability, "OUT_OF_STOCK");
});

test("a generic product never prices the brand, and other products in the payload are ignored", () => {
  assert.equal(pickNuxtPayloadPrice(html, tokens, { strengthMg: 5, packQuantity: 28, generic: false }, url), undefined);
  assert.equal(pickNuxtPayloadPrice(html, ["viagra", "sildenafil"], { strengthMg: 50, packQuantity: 4, generic: true }, url), undefined);
  assert.equal(pickNuxtPayloadPrice(html, ["viagra", "sildenafil"], { strengthMg: 50, packQuantity: 4, generic: true }, "https://cuvahealth.co.uk/product/sildenafil")?.itemPricePence, 995);
  assert.equal(pickNuxtPayloadPrice("<html></html>", tokens, { strengthMg: 5, packQuantity: 28, generic: true }, url), undefined);
});
