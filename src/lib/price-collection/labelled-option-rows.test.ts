import assert from "node:assert/strict";
import test from "node:test";

import { pickLabelledOptionRowPrice } from "./labelled-option-rows";

// Trimmed from Phlo Clinic's ED page: each treatment's options are labelled fields under its name.
const row = (strength: string, quantity: string, price: string) => `<div><span>Strength:</span><span>${strength}</span><span>Quantity / description:</span><span>${quantity}</span><span>${price}</span></div>`;
const section = (name: string, from: string, rows: string) => `<section><h3>${name}</h3><p>Oral tablet</p><p>Price from</p><p>${from}</p><p>Active ingredient(s)</p><p>${name}</p>${rows}<p>${name} is a medicine used to treat erection problems.</p></section>`;
const page = `<h1>Erectile dysfunction treatments</h1><p>Prices from</p><p>£9.99</p>
${section("Sildenafil", "£9.99", row("25mg", "4", "£9.99") + row("50mg", "8", "&pound;16.99") + row("100mg", "8", "£19.99"))}
${section("Vardenafil", "£14.99", row("10mg", "4", "£14.99"))}
${section("Tadalafil", "£12.99", row("10mg", "4", "£12.99") + row("20mg", "4", "£13.99"))}`;
const url = "https://phloclinic.co.uk/male-health/erectile-dysfunction";
const viagra = ["viagra", "sildenafil"];
const cialis = ["cialis", "tadalafil"];

test("reads each labelled option under its own product name", () => {
  assert.equal(pickLabelledOptionRowPrice(page, viagra, { strengthMg: 100, packQuantity: 8, generic: true }, url)?.itemPricePence, 1999);
  assert.equal(pickLabelledOptionRowPrice(page, viagra, { strengthMg: 50, packQuantity: 8, generic: true }, url)?.itemPricePence, 1699);
  assert.equal(pickLabelledOptionRowPrice(page, cialis, { strengthMg: 20, packQuantity: 4, generic: true }, url)?.itemPricePence, 1399);
  // The "Price from" figures are never read, and an option not listed isn't priced.
  assert.equal(pickLabelledOptionRowPrice(page, viagra, { strengthMg: 100, packQuantity: 4, generic: true }, url), undefined);
});

test("generic names never price the brand, and other medicines' rows don't leak", () => {
  assert.equal(pickLabelledOptionRowPrice(page, viagra, { strengthMg: 100, packQuantity: 8, generic: false }, url), undefined);
  // Vardenafil 10mg × 4 (£14.99) sits between the two sections; tadalafil 10mg × 4 is £12.99.
  assert.equal(pickLabelledOptionRowPrice(page, cialis, { strengthMg: 10, packQuantity: 4, generic: true }, url)?.itemPricePence, 1299);
});
