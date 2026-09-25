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

test("keeps branded and generic apart and refuses ambiguity or missing data", () => {
  assert.equal(pickNextDataVariantPrice(html, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, url)?.itemPricePence, 1299);
  assert.equal(pickNextDataVariantPrice(html, tokens, { strengthMg: 50, packQuantity: 4 }, url), undefined);
  assert.equal(pickNextDataVariantPrice(html, tokens, { strengthMg: 25, packQuantity: 4, generic: false }, url), undefined);
  assert.equal(pickNextDataVariantPrice("<html></html>", tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
});
