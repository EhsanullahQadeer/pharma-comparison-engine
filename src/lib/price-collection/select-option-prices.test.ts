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
