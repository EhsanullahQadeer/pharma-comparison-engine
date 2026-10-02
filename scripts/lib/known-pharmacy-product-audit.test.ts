import assert from "node:assert/strict";
import test from "node:test";

import { auditKnownProductPage } from "./known-pharmacy-product-audit";

test("keeps a named ED product and its GBP offer together", () => {
  const html = '<script type="application/ld+json">{"@type":"Product","name":"Tadalafil 10mg tablets","offers":{"@type":"Offer","priceCurrency":"GBP","price":"19.99","name":"4 tablets"}}</script>';
  const result = auditKnownProductPage(html, "https://example.co.uk/product/tadalafil-10mg");
  assert.equal(result.classification, "VERIFIED_PRICED_PRODUCTS");
  assert.deepEqual(result.products, [{ name: "Tadalafil 10mg tablets", priceGbp: "19.99", priceBasis: "4 tablets", erectileDysfunction: true, evidenceType: "PRODUCT_JSON_LD" }]);
});

test("does not attach a generic page price to a product name", () => {
  const html = '<h1>Tadalafil 10mg tablets</h1><p>Delivery costs £4.99</p>';
  const result = auditKnownProductPage(html, "https://example.co.uk/product/tadalafil-10mg");
  assert.equal(result.classification, "PRODUCT_LISTED_PRICE_UNVERIFIED");
  assert.equal(result.products[0].priceGbp, null);
});

test("service pages are separate from product listings without claiming site-wide absence", () => {
  const result = auditKnownProductPage("<h1>Ear clinic</h1>", "https://example.co.uk/ear-clinic/");
  assert.equal(result.classification, "NO_PRODUCT_ON_CITED_PAGE");
  assert.match(result.reason, /not a site-wide absence claim/i);
});

test("ambiguous category pages remain unresolved", () => {
  const result = auditKnownProductPage("<h1>All Products</h1>", "https://example.co.uk/products/all");
  assert.equal(result.classification, "NEEDS_REVIEW");
});
