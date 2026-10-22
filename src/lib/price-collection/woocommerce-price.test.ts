import assert from "node:assert/strict";
import test from "node:test";

import { pickWooCommercePrice } from "./woocommerce-price";

// Shapes taken from live WooCommerce product pages (Pharmaceutra, Razi Meds), trimmed.
function wooPage(title: string, variations: unknown[] | "false", selects: Record<string, string[]>) {
  const encoded = variations === "false" ? "false" : JSON.stringify(variations).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const dropdowns = Object.entries(selects).map(([name, options]) => `<select id="${name}" name="${name}"><option value="">Choose an option</option>${options.map((option) => `<option value="${option}" class="attached enabled">${option}</option>`).join("")}</select>`).join("");
  return `<html><head><title>${title} - Shop</title></head><body><h1 class="product_title entry-title">${title}</h1>
    <form class="variations_form cart" data-product_variations="${encoded}">${dropdowns}</form></body></html>`;
}

const pharmaceutraViagra = wooPage("Viagra (Sildenafil) Tablets", [
  { attributes: { attribute_quantity: "", attribute_strength: "Viagra (Branded) 25mg" }, display_price: 19.99, is_in_stock: true },
  { attributes: { attribute_quantity: "", attribute_strength: "Sildenafil (Generic) 25mg" }, display_price: 6.99, is_in_stock: true },
  { attributes: { attribute_quantity: "", attribute_strength: "Viagra (Branded) 50mg" }, display_price: 29.99, is_in_stock: true },
  { attributes: { attribute_quantity: "", attribute_strength: "Sildenafil (Generic) 50mg" }, display_price: 9.99, is_in_stock: true },
], { attribute_quantity: ["4 tablets"], attribute_strength: ["Viagra (Branded) 25mg", "Sildenafil (Generic) 25mg", "Viagra (Branded) 50mg", "Sildenafil (Generic) 50mg"] });

const tokens = ["viagra", "sildenafil"];
const url = "https://pharmaceutra.co.uk/shop/viagra-sildenafil-tablets/";

test("keeps branded and generic packs apart when they share one dropdown", () => {
  const branded = pickWooCommercePrice(pharmaceutraViagra, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url);
  assert.equal(branded?.itemPricePence, 2999);
  assert.equal(branded?.source, "woocommerce-variation-data");
  const generic = pickWooCommercePrice(pharmaceutraViagra, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, url);
  assert.equal(generic?.itemPricePence, 999);
  // Unknown branded/generic status with two different matching prices is ambiguous → nothing.
  assert.equal(pickWooCommercePrice(pharmaceutraViagra, tokens, { strengthMg: 50, packQuantity: 4 }, url), undefined);
});

test("fills a blank 'any' option only when its dropdown has exactly one choice", () => {
  assert.equal(pickWooCommercePrice(pharmaceutraViagra, tokens, { strengthMg: 25, packQuantity: 4, generic: false }, url)?.itemPricePence, 1999);
  assert.equal(pickWooCommercePrice(pharmaceutraViagra, tokens, { strengthMg: 25, packQuantity: 8, generic: false }, url), undefined);
  const twoQuantities = pharmaceutraViagra.replace('<option value="4 tablets" class="attached enabled">4 tablets</option>', '<option value="4 tablets">4 tablets</option><option value="8 tablets">8 tablets</option>');
  assert.equal(pickWooCommercePrice(twoQuantities, tokens, { strengthMg: 25, packQuantity: 4, generic: false }, url), undefined);
});

test("reads strength from options even when the title names several strengths, and bare pack numbers", () => {
  const razi = wooPage("Cialis 10mg & 20mg Tablets", [
    { attributes: { attribute_strength: "10MG", attribute_quantity: "4" }, display_price: 44.99, is_in_stock: true },
    { attributes: { attribute_strength: "20MG", attribute_quantity: "4" }, display_price: 44.99, is_in_stock: false },
    { attributes: { attribute_strength: "20MG", attribute_quantity: "8" }, display_price: 79.99, is_in_stock: true },
  ], { attribute_strength: ["10MG", "20MG"], attribute_quantity: ["4", "8"] });
  const price = pickWooCommercePrice(razi, ["cialis", "tadalafil"], { strengthMg: 20, packQuantity: 4 }, url);
  assert.equal(price?.itemPricePence, 4499);
  assert.equal(price?.availability, "OUT_OF_STOCK");
});

test("a generic product that only mentions the brand in brackets is not read as branded", () => {
  // Seriva: "Sildenafil (Viagra) Tablets", options say only strength + "4 tablets".
  const seriva = wooPage("Sildenafil (Viagra) Tablets", [
    { attributes: { attribute_strength: "25mg", "attribute_pack-size": "" }, display_price: 9.99, is_in_stock: true },
  ], { attribute_strength: ["25mg"], "attribute_pack-size": ["4 tablets"] });
  assert.equal(pickWooCommercePrice(seriva, tokens, { strengthMg: 25, packQuantity: 4, generic: false }, url), undefined);
  assert.equal(pickWooCommercePrice(seriva, tokens, { strengthMg: 25, packQuantity: 4, generic: true }, url)?.itemPricePence, 999);
  // Razi Meds: branded "Viagra (Sildenafil) Tablets" must not be read as generic sildenafil.
  const razi = wooPage("Viagra (Sildenafil) Tablets", [
    { attributes: { attribute_strength: "100MG", attribute_quantity: "8" }, display_price: 59.99, is_in_stock: true },
  ], { attribute_strength: ["100MG"], attribute_quantity: ["8"] });
  assert.equal(pickWooCommercePrice(razi, tokens, { strengthMg: 100, packQuantity: 8, generic: true }, url), undefined);
  assert.equal(pickWooCommercePrice(razi, tokens, { strengthMg: 100, packQuantity: 8, generic: false }, url)?.itemPricePence, 5999);
});

test("returns nothing without embedded variations or a matching product", () => {
  assert.equal(pickWooCommercePrice(wooPage("Viagra (Sildenafil) Tablets", "false", {}), tokens, { strengthMg: 50, packQuantity: 4 }, url), undefined);
  assert.equal(pickWooCommercePrice(pharmaceutraViagra, ["cialis"], { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
});

test("a regular price above the sale price is kept as the was price", () => {
  const sale = wooPage("Viagra (Sildenafil) Tablets", [
    { attributes: { attribute_quantity: "", attribute_strength: "Sildenafil (Generic) 50mg" }, display_price: 9.99, display_regular_price: 14.99, is_in_stock: true },
    { attributes: { attribute_quantity: "", attribute_strength: "Viagra (Branded) 50mg" }, display_price: 29.99, display_regular_price: 29.99, is_in_stock: true },
  ], { attribute_quantity: ["4 tablets"], attribute_strength: ["Sildenafil (Generic) 50mg", "Viagra (Branded) 50mg"] });
  const onSale = pickWooCommercePrice(sale, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, url);
  assert.equal(onSale?.itemPricePence, 999);
  assert.equal(onSale?.wasPricePence, 1499);
  const fullPrice = pickWooCommercePrice(sale, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url);
  assert.equal(fullPrice?.itemPricePence, 2999);
  assert.equal(fullPrice?.wasPricePence, undefined);
});
