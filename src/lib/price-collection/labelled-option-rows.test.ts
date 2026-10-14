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

// Trimmed from Medy's ED page as drawn in a browser: a column header, then unlabelled rows. Every
// section is tagged "GENERIC", the branded ones included.
const columnSection = (name: string, rows: [string, string, string][]) => `<div><h3>${name}</h3><span>GENERIC</span><table><tr><th>DOSE</th><th>USAGE</th><th>QTY</th><th>PRICE</th></tr>${rows.map(([dose, qty, price]) => `<tr><td>${dose}${qty === "28" ? "<span>DAILY</span>" : ""}</td><td>${qty === "28" ? "Daily" : "On-Demand"}</td><td>${qty}</td><td>${price}</td></tr>`).join("")}</table></div>`;
const medy = `<h2>ED Medication Pricing</h2>
${columnSection("Cialis", [["10mg", "4", "£34.40"], ["20mg", "8", "£62.99"]])}
${columnSection("Cialis (Daily)", [["2.5mg", "28", "£59.99"], ["5mg", "28", "£62.50"]])}
${columnSection("Sildenafil", [["50mg", "4", "£4.50"], ["100mg", "8", "£12.00"]])}
${columnSection("Spedra", [["100mg", "4", "£19.29"]])}
${columnSection("Tadalafil (Daily)", [["5mg", "28", "£16.99"]])}
${columnSection("Viagra", [["50mg", "4", "£22.50"], ["100mg", "4", "£24.99"]])}`;
const medyUrl = "https://www.medy.uk/erectile-dysfunction";

test("reads unlabelled rows under a Dose / Qty / Price header (Medy)", () => {
  assert.equal(pickLabelledOptionRowPrice(medy, viagra, { strengthMg: 50, packQuantity: 4, generic: false }, medyUrl)?.itemPricePence, 2250);
  assert.equal(pickLabelledOptionRowPrice(medy, viagra, { strengthMg: 100, packQuantity: 8, generic: true }, medyUrl)?.itemPricePence, 1200);
  assert.equal(pickLabelledOptionRowPrice(medy, cialis, { strengthMg: 10, packQuantity: 4, generic: false }, medyUrl)?.itemPricePence, 3440);
  // Daily rows carry a "DAILY" badge and "Daily" usage between the strength and the count.
  assert.equal(pickLabelledOptionRowPrice(medy, cialis, { strengthMg: 5, packQuantity: 28, generic: false }, medyUrl)?.itemPricePence, 6250);
  assert.equal(pickLabelledOptionRowPrice(medy, cialis, { strengthMg: 5, packQuantity: 28, generic: true }, medyUrl)?.itemPricePence, 1699);
});

test("the section name, not a GENERIC tag, decides the side; other medicines' rows don't leak", () => {
  // Branded Viagra 100mg × 4 is £24.99; sildenafil has no 100mg × 4 here and Spedra's £19.29 is never read.
  assert.equal(pickLabelledOptionRowPrice(medy, viagra, { strengthMg: 100, packQuantity: 4, generic: true }, medyUrl), undefined);
  assert.equal(pickLabelledOptionRowPrice(medy, viagra, { strengthMg: 50, packQuantity: 4, generic: true }, medyUrl)?.itemPricePence, 450);
  // Rows without a column header above them aren't read as options.
  assert.equal(pickLabelledOptionRowPrice(medy.replace(/<th>QTY<\/th>/g, ""), viagra, { strengthMg: 50, packQuantity: 4, generic: false }, medyUrl), undefined);
});
