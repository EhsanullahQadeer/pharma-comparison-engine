import assert from "node:assert/strict";
import test from "node:test";

import { pickNextDataVariantPrice } from "./next-data-variant-price";

// Shape taken from a live Mail My Meds product page's __NEXT_DATA__, trimmed.
function variantProduct(sku: string, value: number, stock = "OUT_OF_STOCK") {
  const money = { amount: { currency: "GBP", value, __typename: "Money" }, __typename: "Price" };
  return { product: { sku, stock_status: stock, price: { minimalPrice: money, maximalPrice: money, regularPrice: money } } };
}

const nextData = {
  props: {
    pageProps: {
      product: { sku: "Viagra (Sildenafil)", name: "Viagra (Sildenafil)" },
      productOptions: {
        variants: [
          variantProduct("Viagra (Sildenafil)-Generic (Sildenafil)-50mg-4 Tablets", 12.99),
          variantProduct("Viagra (Sildenafil)-Generic (Sildenafil)-100mg-8 Tablets", 24.99),
          variantProduct("Viagra (Sildenafil)-Branded (Viagra)-50mg-4 Tablets", 29.99),
          variantProduct("Viagra (Sildenafil)-Branded (Viagra)-100mg-4 Tablets", 29.99, "IN_STOCK"),
        ],
      },
    },
  },
};
const html = `<html><body><div id="__next"></div><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script></body></html>`;
const tokens = ["viagra", "sildenafil"];
const url = "https://www.mailmymeds.co.uk/viagra-sildenafil";

test("reads the exact variant's price and stock from the page's variant list", () => {
  const branded = pickNextDataVariantPrice(html, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url);
  assert.equal(branded?.itemPricePence, 2999);
  assert.equal(branded?.availability, "OUT_OF_STOCK");
  assert.equal(branded?.source, "next-data-variants");
  assert.equal(pickNextDataVariantPrice(html, tokens, { strengthMg: 100, packQuantity: 4, generic: false }, url)?.availability, "IN_STOCK");
  assert.equal(pickNextDataVariantPrice(html, tokens, { strengthMg: 100, packQuantity: 8, generic: true }, url)?.itemPricePence, 2499);
});

// Trimmed from My Private Pharmacist's product page: a whole Shopify product embedded by its CMS,
// options named "Brand or Generic" / "Strength" / "Quantity" (bare counts), prices as strings.
const shopifyProduct = {
  title: "Viagra (Sildenafil)",
  options: [{ name: "Brand or Generic" }, { name: "Strength" }, { name: "Quantity" }],
  variants: [
    { title: "Viagra (Brand) / 25mg / 4", price: "24.99", option1: "Viagra (Brand)", option2: "25mg", option3: "4" },
    { title: "Viagra (Brand) / 50mg / 8", price: "57.99", option1: "Viagra (Brand)", option2: "50mg", option3: "8" },
    { title: "Sildenafil (Generic Viagra) / 25mg / 4", price: "9.99", option1: "Sildenafil (Generic Viagra)", option2: "25mg", option3: "4" },
    { title: "Sildenafil (Generic Viagra) / 100mg / 32", price: "85.99", option1: "Sildenafil (Generic Viagra)", option2: "100mg", option3: "32" },
  ],
};
const shopifyHtml = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { doc: { data: { body: [{ primary: { shopify_product: shopifyProduct } }] } } } } })}</script>`;
const mppUrl = "https://myprivatepharmacist.co.uk/product/viagra-sildenafil";

test("reads a Shopify product's option buttons (brand/generic, strength, bare quantity)", () => {
  assert.equal(pickNextDataVariantPrice(shopifyHtml, tokens, { strengthMg: 25, packQuantity: 4, generic: false }, mppUrl)?.itemPricePence, 2499);
  assert.equal(pickNextDataVariantPrice(shopifyHtml, tokens, { strengthMg: 50, packQuantity: 8, generic: false }, mppUrl)?.itemPricePence, 5799);
  assert.equal(pickNextDataVariantPrice(shopifyHtml, tokens, { strengthMg: 25, packQuantity: 4, generic: true }, mppUrl)?.itemPricePence, 999);
  assert.equal(pickNextDataVariantPrice(shopifyHtml, tokens, { strengthMg: 100, packQuantity: 32, generic: true }, mppUrl)?.itemPricePence, 8599);
  assert.equal(pickNextDataVariantPrice(shopifyHtml, tokens, { strengthMg: 100, packQuantity: 32, generic: false }, mppUrl), undefined);
  assert.equal(pickNextDataVariantPrice(shopifyHtml, tokens, { strengthMg: 25, packQuantity: 4 }, mppUrl), undefined);
});

test("reads a quantity with a duration note, e.g. '28 (4 week)'", () => {
  const everyday = {
    title: "Cialis (Tadalafil) Everyday",
    options: [{ name: "Brand or Generic" }, { name: "Strength" }, { name: "Quantity" }],
    variants: [
      { price: "69.99", option1: "Cialis (Brand)", option2: "5mg (Daily use-standard dose)", option3: "28 (4 week)" },
      { price: "34.99", option1: "Tadalafil (Generic Cialis)", option2: "5mg (Daily use-standard dose)", option3: "28 (4 week)" },
      { price: "69.99", option1: "Tadalafil (Generic Cialis)", option2: "5mg (Daily use-standard dose)", option3: "56 (8 week)" },
    ],
  };
  const page = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { product: everyday } } })}</script>`;
  const tadalafil = ["cialis", "tadalafil"];
  assert.equal(pickNextDataVariantPrice(page, tadalafil, { strengthMg: 5, packQuantity: 28, generic: true }, mppUrl)?.itemPricePence, 3499);
  assert.equal(pickNextDataVariantPrice(page, tadalafil, { strengthMg: 5, packQuantity: 28, generic: false }, mppUrl)?.itemPricePence, 6999);
});

// Trimmed from Pharmacy Online's App Router page: the product streams in `self.__next_f` chunks,
// prices in pence, strength and pack as attributes; a related product streams alongside it.
function flightVariant(strength: string, pack: string, price: number, extra: Record<string, unknown> = {}) {
  return { price, units_available: 9999, is_active: true, is_bundle: false, deleted_at: null, sale_price: null, sale_start_date: null, sale_end_date: null, attributes: [{ attribute_name: "Strength", attribute_value: strength }, { attribute_name: "Pack Size", attribute_value: pack }], ...extra };
}
const flightPayload = `3:{"slug":"sildenafil","title":"Sildenafil","variants":${JSON.stringify([flightVariant("50mg", "4", 999)])}}`
  + `\n4:{"slug":"viagra","title":"Viagra","variants":${JSON.stringify([
    flightVariant("25mg", "4", 2499),
    flightVariant("50mg", "4", 2999),
    flightVariant("100mg", "8", 6399, { units_available: 0 }),
    flightVariant("50mg", "8", 5899, { sale_price: 4999, sale_start_date: "$D2020-01-01T00:00:00.000Z", sale_end_date: "$D2099-01-01T00:00:00.000Z" }),
    flightVariant("100mg", "4", 3399, { sale_price: 1000, sale_end_date: "$D2020-01-01T00:00:00.000Z" }),
  ])}}`;
const flightHtml = `<script>self.__next_f.push([1,${JSON.stringify(flightPayload.slice(0, 40))}])</script><script>self.__next_f.push([1,${JSON.stringify(flightPayload.slice(40))}])</script>`;
const poUrl = "https://www.pharmacyonline.co.uk/products/viagra";

test("reads the page's own product from an App Router stream split across chunks", () => {
  assert.equal(pickNextDataVariantPrice(flightHtml, tokens, { strengthMg: 25, packQuantity: 4, generic: false }, poUrl)?.itemPricePence, 2499);
  assert.equal(pickNextDataVariantPrice(flightHtml, tokens, { strengthMg: 100, packQuantity: 8, generic: false }, poUrl)?.availability, "OUT_OF_STOCK");
  // Only while the sale window is open does the sale price apply.
  assert.equal(pickNextDataVariantPrice(flightHtml, tokens, { strengthMg: 50, packQuantity: 8, generic: false }, poUrl)?.itemPricePence, 4999);
  assert.equal(pickNextDataVariantPrice(flightHtml, tokens, { strengthMg: 100, packQuantity: 4, generic: false }, poUrl)?.itemPricePence, 3399);
  // The related generic product's £9.99 is never read for this page.
  assert.equal(pickNextDataVariantPrice(flightHtml, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, poUrl), undefined);
  assert.equal(pickNextDataVariantPrice(flightHtml, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, "https://www.pharmacyonline.co.uk/products/sildenafil")?.itemPricePence, 999);
});

test("reads SynovaMed's streamed variants: one-off GBP price blocks and plain strength/pack fields", () => {
  const variant = (packSize: string, amount: number) => ({ name: `10mg - ${packSize} Tablets`, price: { currency: "GBP", amount }, oneOffPrice: { currency: "GBP", amount }, inStock: false, strength: "10mg", packSize, subscriptionPrices: { month3: { currency: "GBP", amount: 0 } } });
  const payload = `5:{"slug":"cialis-together","name":"Cialis Together","subtitle":"Over the counter Cialis","variants":${JSON.stringify([variant("4", 1999), variant("12", 5499)])}}`;
  const page = `<script>self.__next_f.push([1,${JSON.stringify(payload)}])</script>`;
  const url = "https://synovamed.co.uk/products/cialis-together";
  const together = ["cialis together", "tadalafil", "cialis"];
  const result = pickNextDataVariantPrice(page, together, { strengthMg: 10, packQuantity: 4, generic: false }, url);
  assert.equal(result?.itemPricePence, 1999);
  assert.equal(result?.availability, "OUT_OF_STOCK");
  assert.equal(pickNextDataVariantPrice(page, together, { strengthMg: 10, packQuantity: 12, generic: false }, url)?.itemPricePence, 5499);
  // Never priced as prescription Cialis.
  assert.equal(pickNextDataVariantPrice(page, ["cialis", "tadalafil"], { strengthMg: 10, packQuantity: 4, generic: false }, url), undefined);
});

test("reads The Independent Pharmacy's variants: packs × pack size, past a nested slug", () => {
  // As streamed: the treatment object nests its condition's slug, and the variants sit beside the
  // treatment in its parent. A menu entry with the same slug comes first, and a list of related
  // products (one with its own variants) elsewhere must never be read as this page's.
  const treatment = {
    slug: "cialis-once-daily-tablets",
    title: "Cialis Once Daily Tablets (2.5mg & 5mg)",
    condition: { primaryCondition: { slug: "erectile-dysfunction-ed", title: "Erectile Dysfunction" } },
    selectedReview: { averageRating: 4.2, sku: "TIP-3602;" },
  };
  const variants = [
    { name: "Cialis 5mg Tablets", pack_size: "28 tablets", available: true, quantities: [{ quantity: 1, label: "x 28 tablets", price: 8799 }, { quantity: 2, label: "x 28 tablets", price: 15598 }] },
    { name: "Cialis 2.5mg Tablets", pack_size: "28 tablets", available: false, quantities: [{ quantity: 1, label: "x 28 tablets", price: 8799 }] },
  ];
  const related = [{ slug: "cialis-once-daily-tablets", title: "Cialis Once Daily" }, { treatment: { slug: "tadalafil-tablets", title: "Tadalafil" }, variants: [{ name: "Tadalafil 5mg Tablets", pack_size: "28 tablets", available: true, quantities: [{ quantity: 1, price: 1999 }] }] }];
  const payload = `7:${JSON.stringify({ menu: related })}\n8:${JSON.stringify({ treatment, variants })}`;
  const page = `<script>self.__next_f.push([1,${JSON.stringify(payload)}])</script>`;
  const url = "https://www.theindependentpharmacy.co.uk/erectile-dysfunction-ed/cialis-once-daily-tablets";
  const cialis = ["cialis", "tadalafil"];
  const single = pickNextDataVariantPrice(page, cialis, { strengthMg: 5, packQuantity: 28, generic: false }, url);
  assert.equal(single?.itemPricePence, 8799);
  assert.equal(single?.availability, "IN_STOCK");
  // Two packs of 28 are a 56-tablet purchase.
  assert.equal(pickNextDataVariantPrice(page, cialis, { strengthMg: 5, packQuantity: 56, generic: false }, url)?.itemPricePence, 15598);
  // A branded Cialis page never prices generic tadalafil.
  assert.equal(pickNextDataVariantPrice(page, cialis, { strengthMg: 5, packQuantity: 28, generic: true }, url), undefined);
});

test("keeps branded and generic apart and refuses ambiguity or missing data", () => {
  assert.equal(pickNextDataVariantPrice(html, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, url)?.itemPricePence, 1299);
  assert.equal(pickNextDataVariantPrice(html, tokens, { strengthMg: 50, packQuantity: 4 }, url), undefined);
  assert.equal(pickNextDataVariantPrice(html, tokens, { strengthMg: 25, packQuantity: 4, generic: false }, url), undefined);
  assert.equal(pickNextDataVariantPrice("<html></html>", tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
});
