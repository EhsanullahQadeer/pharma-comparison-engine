import assert from "node:assert/strict";
import test from "node:test";

import { pickPharmacyPluginPrice } from "./pharmacy-plugin-price";

// Entries as published on a live Rai's Pharmacy / Prime Med product page, trimmed to the fields used.
const entries = [
  { strength: "100mg", quantity: "4 Tablets", price: "17.99", status: "1", subscription_days: "0" },
  { strength: "50mg", quantity: "8 Tablets", price: "25.00", status: "1", subscription_days: "0" },
  { strength: "50mg", quantity: "4 Tablets", price: "15.00", status: "1", subscription_days: "0" },
  { strength: "50mg", quantity: "8 Tablets", price: "27.99", status: "1", subscription_days: "0" },
  { strength: "25mg", quantity: "4 Tablets", price: "15.00", status: "1", subscription_days: "0" },
  { strength: "25mg", quantity: "8 Tablets", price: "20.00", status: "0", subscription_days: "0" },
  { strength: "25mg", quantity: "16 Tablets", price: "36.00", status: "1", subscription_days: "28" },
];

function page(title: string, list: unknown[]) {
  return `<html><head><title>${title}</title></head><body><h1 class="upw__title">${title}</h1>
    <form class="upw__product__form"><input type="radio" name="strength" value="35"></form>
    <script> const prices = ${JSON.stringify(list)}; jQuery(".strength-radio").on("change", () => {}); </script></body></html>`;
}

const html = page("Viagra (Sildenafil) Tablets", entries);
const tokens = ["viagra", "sildenafil"];
const url = "https://raispharmacy.co.uk/product/viagra-sildenafil-tablets/";

test("reads the exact strength + quantity from the embedded price list", () => {
  const price = pickPharmacyPluginPrice(html, tokens, { strengthMg: 100, packQuantity: 4 }, url);
  assert.equal(price?.itemPricePence, 1799);
  assert.equal(price?.source, "pharmacy-plugin-price-list");
  assert.equal(price?.evidence, "Viagra (Sildenafil) Tablets: 100mg 4 Tablets");
  assert.equal(pickPharmacyPluginPrice(html, tokens, { strengthMg: 25, packQuantity: 4 }, url)?.itemPricePence, 1500);
});

test("refuses combinations listed twice at different prices, inactive or subscription-only", () => {
  assert.equal(pickPharmacyPluginPrice(html, tokens, { strengthMg: 50, packQuantity: 8 }, url), undefined);
  assert.equal(pickPharmacyPluginPrice(html, tokens, { strengthMg: 25, packQuantity: 8 }, url), undefined);
  assert.equal(pickPharmacyPluginPrice(html, tokens, { strengthMg: 25, packQuantity: 16 }, url), undefined);
  assert.equal(pickPharmacyPluginPrice(html, tokens, { strengthMg: 100, packQuantity: 8 }, url), undefined);
});

test("treats a bare pack number as a tablet count", () => {
  const sildenafil = page("Sildenafil Tablets", [{ strength: "50 mg", quantity: "4", price: "5.50", status: "1", subscription_days: "0" }]);
  assert.equal(pickPharmacyPluginPrice(sildenafil, tokens, { strengthMg: 50, packQuantity: 4 }, url)?.itemPricePence, 550);
});

test("needs the product name to carry an ingredient/brand token and a price list to exist", () => {
  assert.equal(pickPharmacyPluginPrice(html, ["cialis", "tadalafil"], { strengthMg: 100, packQuantity: 4 }, url), undefined);
  assert.equal(pickPharmacyPluginPrice("<h1>Viagra</h1><script>const other = [];</script>", tokens, { strengthMg: 100, packQuantity: 4 }, url), undefined);
});
