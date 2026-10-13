import assert from "node:assert/strict";
import test from "node:test";

import { pickSelectOptionPrice } from "./select-option-prices";

// Trimmed from Simple Online Pharmacy's Viagra page: a generic list ("4 x 50mg") and one list per
// Pfizer strength (bare counts), each option carrying its own data.
const option = (dose: string, quantity: string, legacy: string, price: string, sale = "0", salePrice = "0") =>
  `<option value="1" data-dose="${dose}" data-quantity="${quantity}" data-legacy-size-name="${legacy}" data-price="${price}" data-sale="${sale}" data-sale-price="${salePrice}"> ${quantity} : £${price} </option>`;
const page = `<h1 style="font-size: 22px">Viagra</h1>
<select class="itemStrengths"><option> Generic Viagra (Sildenafil) </option><option> Pfizer - 50mg </option></select>
<select class="itemSizes">${option("Generic Viagra (Sildenafil)", "4 x 50mg", "Sildenafil (Generic Viagra) 50mg x 4", "7.49")}${option("Generic Viagra (Sildenafil)", "4 x 100mg", "Sildenafil (Generic Viagra) 100mg x 4", "8.19")}</select>
<select class="itemSizes">${option("Pfizer - 50mg", "4", "50mg x 4", "29.95")}${option("Pfizer - 50mg", "8", "50mg x 8", "58.95", "1", "49.95")}</select>
<select class="itemSizes">${option("Pfizer - 100mg", "4", "100mg x 4", "33.5")}</select>`;
const tokens = ["viagra", "sildenafil"];
const url = "https://www.simpleonlinepharmacy.co.uk/online-doctor/erectile-dysfunction/viagra/";

test("reads the branded (Pfizer) and generic option lists apart", () => {
  assert.equal(pickSelectOptionPrice(page, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url)?.itemPricePence, 2995);
  assert.equal(pickSelectOptionPrice(page, tokens, { strengthMg: 100, packQuantity: 4, generic: false }, url)?.itemPricePence, 3350);
  assert.equal(pickSelectOptionPrice(page, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, url)?.itemPricePence, 749);
  assert.equal(pickSelectOptionPrice(page, tokens, { strengthMg: 100, packQuantity: 4, generic: true }, url)?.itemPricePence, 819);
});

test("uses a sale price only when the option is on sale, and refuses unlisted packs", () => {
  assert.equal(pickSelectOptionPrice(page, tokens, { strengthMg: 50, packQuantity: 8, generic: false }, url)?.itemPricePence, 4995);
  assert.equal(pickSelectOptionPrice(page, tokens, { strengthMg: 50, packQuantity: 16, generic: false }, url), undefined);
  assert.equal(pickSelectOptionPrice(page.replace(/<h1[\s\S]*?<\/h1>/, ""), tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
});

// Trimmed from Cloud Pharmacy: one custom listbox of buttons, each holding strength, pack and price.
const listbox = (options: [string, string, string][]) => options.map(([name, price, stock]) => `<button type="button" class="pdpv2-dose__option" role="option" data-size-id="1" data-name="${name}" data-price="${price}" data-was="" data-stock="In Stock" data-in-stock="${stock}" >`).join("");
const cloudUrl = "https://www.cloudpharmacy.co.uk/products/cialis-together/";

test("reads a single dropdown holding strength, pack and price together (Cloud Pharmacy)", () => {
  const together = `<h1 class="pdpv2-buy__title">Cialis Together Tablets</h1><div role="listbox" aria-label="Pack Size">${listbox([["10mg x 4", "£18.99", "1"], ["10mg x 8", "£33.99", "0"]])}</div>`;
  const togetherTokens = ["cialis together", "tadalafil", "cialis"];
  const four = pickSelectOptionPrice(together, togetherTokens, { strengthMg: 10, packQuantity: 4, generic: false }, cloudUrl);
  assert.equal(four?.itemPricePence, 1899);
  assert.equal(four?.availability, "IN_STOCK");
  assert.equal(pickSelectOptionPrice(together, togetherTokens, { strengthMg: 10, packQuantity: 8, generic: false }, cloudUrl)?.availability, "OUT_OF_STOCK");
  // Never prescription Cialis.
  assert.equal(pickSelectOptionPrice(together, ["cialis", "tadalafil"], { strengthMg: 10, packQuantity: 4, generic: false }, cloudUrl), undefined);
});

test("a heading that lists every strength doesn't clash with the option's own", () => {
  const sildenafil = `<h1>Sildenafil Tablets (25mg, 50mg &amp; 100mg)</h1>${listbox([["25mg x 4", "£6.99", "1"], ["50mg x 4", "£11.99", "1"], ["100mg x 8", "£19.99", "1"]])}`;
  assert.equal(pickSelectOptionPrice(sildenafil, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, cloudUrl)?.itemPricePence, 1199);
  assert.equal(pickSelectOptionPrice(sildenafil, tokens, { strengthMg: 100, packQuantity: 8, generic: true }, cloudUrl)?.itemPricePence, 1999);
  // A generic sildenafil page never prices branded Viagra.
  assert.equal(pickSelectOptionPrice(sildenafil, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, cloudUrl), undefined);
});

// Trimmed from Online Pharmacy 4U (as drawn in a browser): pack buttons that each show their price.
const packButtons = (heading: string, group: string, packs: [string, string][]) => `<h1 class="text-2xl">${heading}</h1><div><h3 class="text-xs">${group}<span class="ml-2">${packs[0][0]}</span></h3><div class="flex">${packs.map(([pack, price]) => `<button type="button" class="px-4">${pack}<span class="ml-1.5 text-xs">${price}</span></button>`).join("")}</div></div><button type="button" class="px-4">−</button><button type="button" class="flex-1">Add to Cart</button>`;
const op4uUrl = "https://online-pharmacy4u.co.uk/product/cialis-together-10mg-tadalafil";

test("reads pack buttons that show their own price (Online Pharmacy 4U)", () => {
  const together = packButtons("Cialis Together 10mg (tadalafil) (4 Tablets)", "Pack Size", [["4 Tablets", "£18.28"], ["8 Tablets", "£36.57"]]);
  const togetherTokens = ["cialis together", "tadalafil", "cialis"];
  assert.equal(pickSelectOptionPrice(together, togetherTokens, { strengthMg: 10, packQuantity: 4, generic: false }, op4uUrl)?.itemPricePence, 1828);
  // The heading's "(4 Tablets)" is only the pack currently chosen.
  assert.equal(pickSelectOptionPrice(together, togetherTokens, { strengthMg: 10, packQuantity: 8, generic: false }, op4uUrl)?.itemPricePence, 3657);
  assert.equal(pickSelectOptionPrice(together, togetherTokens, { strengthMg: 10, packQuantity: 12, generic: false }, op4uUrl), undefined);
  assert.equal(pickSelectOptionPrice(together, ["cialis", "tadalafil"], { strengthMg: 10, packQuantity: 4, generic: false }, op4uUrl), undefined);
});

test("the group heading supplies a strength the product name leaves out", () => {
  const connect = packButtons("Viagra Connect (4 Tablets)", "Pack Size - 50mg", [["4 Tablets", "£21.98"], ["8 Tablets", "£43.90"]]);
  assert.equal(pickSelectOptionPrice(connect, ["viagra connect", "sildenafil", "viagra"], { strengthMg: 50, packQuantity: 8, generic: false }, op4uUrl)?.itemPricePence, 4390);
  const generic = packButtons("Sildenafil Tablets (4 Tablets)", "Pack Size - 100mg", [["4 Tablets", "£12.50"], ["8 Tablets", "£14.98"]]);
  assert.equal(pickSelectOptionPrice(generic, tokens, { strengthMg: 100, packQuantity: 8, generic: true }, op4uUrl)?.itemPricePence, 1498);
  assert.equal(pickSelectOptionPrice(generic, tokens, { strengthMg: 50, packQuantity: 8, generic: true }, op4uUrl), undefined);
  // A generic product's page never prices branded Viagra.
  assert.equal(pickSelectOptionPrice(generic, tokens, { strengthMg: 100, packQuantity: 8, generic: false }, op4uUrl), undefined);
});
