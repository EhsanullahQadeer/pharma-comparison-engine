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

test("keeps branded and generic apart and refuses ambiguity or missing data", () => {
  assert.equal(pickNextDataVariantPrice(html, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, url)?.itemPricePence, 1299);
  assert.equal(pickNextDataVariantPrice(html, tokens, { strengthMg: 50, packQuantity: 4 }, url), undefined);
  assert.equal(pickNextDataVariantPrice(html, tokens, { strengthMg: 25, packQuantity: 4, generic: false }, url), undefined);
  assert.equal(pickNextDataVariantPrice("<html></html>", tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
});
