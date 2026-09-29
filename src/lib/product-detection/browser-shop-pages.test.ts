import assert from "node:assert/strict";
import test from "node:test";

import { isEdCategoryLink, isShopLink } from "./browser-shop-pages";
import { isSameSite } from "./detect-products";

test("a pharmacy's subdomains are its own site, lookalike domains are not", () => {
  assert.equal(isSameSite("app.oxforde-pharmacy.co.uk", "oxforde-pharmacy.co.uk"), true);
  assert.equal(isSameSite("oxforde-pharmacy.co.uk", "www.oxforde-pharmacy.co.uk"), true);
  assert.equal(isSameSite("notoxforde-pharmacy.co.uk", "oxforde-pharmacy.co.uk"), false);
  assert.equal(isSameSite("healthera.co.uk", "oxforde-pharmacy.co.uk"), false);
});

test("ED category listings are recognised by path, category query or link label", () => {
  assert.equal(isEdCategoryLink({ url: "https://x.co.uk/erectile-dysfunction", text: "" }), true);
  assert.equal(isEdCategoryLink({ url: "https://app.x.co.uk/marketplace?category=Erectile+Dysfunction&category_group=all", text: "" }), true);
  assert.equal(isEdCategoryLink({ url: "https://x.co.uk/mens-health/c/42", text: " Erectile Dysfunction (ED) " }), true);
});

test("a product page's breadcrumb query is not a category listing", () => {
  assert.equal(isEdCategoryLink({ url: "https://app.x.co.uk/marketplace/product?product_name=Viagra+Connect&product_id=1&from=Erectile+Dysfunction", text: "" }), false);
  assert.equal(isEdCategoryLink({ url: "https://x.co.uk/blog/erectile-dysfunction-causes", text: "Read more" }), false);
});

test("shop entry points are recognised by label or single shop path", () => {
  assert.equal(isShopLink({ url: "https://app.x.co.uk/marketplace", text: "" }), true);
  assert.equal(isShopLink({ url: "https://x.co.uk/c/all", text: "Pharmacy Shop" }), true);
  assert.equal(isShopLink({ url: "https://x.co.uk/shop/hay-fever", text: "Hay fever" }), false);
});
