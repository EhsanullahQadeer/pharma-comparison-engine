import assert from "node:assert/strict";
import test from "node:test";

import { pickShopifyMetaPrice } from "./shopify-meta-price";

// Shape of Shopify's analytics `var meta` on a live Your Medicals product page, trimmed.
function page(title: string, variants: [string, number][]) {
  const meta = { product: { id: 1, vendor: "YourMedicals", type: "ED", variants: variants.map(([option, price], index) => ({ id: index, price, name: `${title} - ${option}`, public_title: option, sku: null })) }, page: { pageType: "product" } };
  return `<html><body><script>var meta = ${JSON.stringify(meta)};\nfor (var attr in meta) { window.ShopifyAnalytics.meta[attr] = meta[attr]; }</script></body></html>`;
}
const url = "https://yourmedicals.co.uk/products/viagra-tablets-branded-sildenafil";

test("reads the exact variant's list price from Shopify's product meta", () => {
  const html = page("Viagra Tablets (Branded Sildenafil)", [["25mg / 4 Tablets", 2849], ["50mg / 4 Tablets", 3499], ["50mg / 8 Tablets", 6649]]);
  const price = pickShopifyMetaPrice(html, ["viagra", "sildenafil"], { strengthMg: 50, packQuantity: 4, generic: false }, url);
  assert.equal(price?.itemPricePence, 3499);
  assert.equal(price?.source, "shopify-product-meta");
  assert.equal(pickShopifyMetaPrice(html, ["viagra", "sildenafil"], { strengthMg: 50, packQuantity: 4, generic: true }, url), undefined);
});

test("a generic product and a missing pack are not matched", () => {
  const generic = page("Sildenafil Tablets", [["100mg / 8 Tablets", 849]]);
  assert.equal(pickShopifyMetaPrice(generic, ["viagra", "sildenafil"], { strengthMg: 100, packQuantity: 8, generic: false }, url), undefined);
  assert.equal(pickShopifyMetaPrice(generic, ["viagra", "sildenafil"], { strengthMg: 100, packQuantity: 8, generic: true }, url)?.itemPricePence, 849);
  assert.equal(pickShopifyMetaPrice(generic, ["viagra", "sildenafil"], { strengthMg: 100, packQuantity: 4, generic: true }, url), undefined);
});

// The full product JSON a Shopify theme also embeds (shape from LloydsDirect, trimmed): "/" escaped
// as "\/", each variant's own compare_at_price, then its subscribe-and-save allocations.
function productJson(variants: { name: string; price: number; compare: number | null; planCompare?: number }[]) {
  const json = variants.map((v) => `{"name":"${v.name}","public_title":null,"options":[],"price":${v.price},"weight":0,"compare_at_price":${v.compare},"inventory_management":"shopify","selling_plan_allocations":[${v.planCompare ? `{"price":${v.price - 300},"compare_at_price":${v.planCompare}}` : ""}]}`.replace(/\//g, "\/"));
  return `<script>var product = {"variants":[${json.join(",")}]};</script>`;
}

test("the variant's own compare-at price is its was price; a subscription comparison is not", () => {
  const title = "Viagra Tablets (Branded Sildenafil)";
  const meta = page(title, [["50mg / 4 Tablets", 1999], ["50mg / 8 Tablets", 3499]]);
  const html = meta + productJson([
    { name: `${title} - 50mg / 4 Tablets`, price: 1999, compare: 2499 },
    { name: `${title} - 50mg / 8 Tablets`, price: 3499, compare: null, planCompare: 3499 },
  ]);
  const tokens = ["viagra", "sildenafil"];
  const sale = pickShopifyMetaPrice(html, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url);
  assert.equal(sale?.itemPricePence, 1999);
  assert.equal(sale?.wasPricePence, 2499);
  const subscriptionOnly = pickShopifyMetaPrice(html, tokens, { strengthMg: 50, packQuantity: 8, generic: false }, url);
  assert.equal(subscriptionOnly?.itemPricePence, 3499);
  assert.equal(subscriptionOnly?.wasPricePence, undefined);
});
