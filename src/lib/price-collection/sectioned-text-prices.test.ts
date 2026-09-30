import assert from "node:assert/strict";
import test from "node:test";

import { readSectionedTextPrice } from "./sectioned-text-prices";

// Trimmed from Rx Live Clinic's rendered triage page (its visible text, one item per line).
const text = [
  "Sildenafil (Viagra®/Generic)", "PDE5 Inhibitor", "from £14.99", "QUANTITY / STRENGTH", "BULK BUY", "PRICE",
  "25mg · 4 tablets (as needed)", "1 tablet", "£14.99",
  "50mg · 8 tablets (as needed)", "1 tablet", "£19.99",
  "Viagra® (Branded)", "PDE5 Inhibitor — Branded", "from £34.99",
  "25mg · 4 tablets (as needed)", "1 tablet", "£34.99",
  "50mg · 8 tablets (as needed)", "1 tablet", "£44.99",
  "Vardenafil (Levitra®)", "5mg · 4 tablets (as needed)", "1 tablet", "£19.99",
  "10mg · 8 tablets (as needed)", "1 tablet", "£24.99",
  "Viagra Connect® 50mg (OTC Sildenafil)", "PDE5 Inhibitor — Pharmacy (P) medicine", "from £21.99",
  "50mg · 4 tablets", "1 tablet", "£21.99",
  "Tadalafil (Cialis®/Generic)", "10mg as needed · 8 tablets", "1 tablet", "£24.99",
  "Cialis® (Branded)", "10mg as needed · 8 tablets", "1 tablet", "£44.99",
].join("\n");
const viagra = ["viagra", "sildenafil"];
const cialis = ["cialis", "tadalafil"];

test("each row is priced as the product in its section title, branded or generic", () => {
  assert.equal(readSectionedTextPrice(text, viagra, { strengthMg: 25, packQuantity: 4, generic: true })?.itemPricePence, 1499);
  assert.equal(readSectionedTextPrice(text, viagra, { strengthMg: 25, packQuantity: 4, generic: false })?.itemPricePence, 3499);
  assert.equal(readSectionedTextPrice(text, viagra, { strengthMg: 50, packQuantity: 8, generic: false })?.itemPricePence, 4499);
  assert.equal(readSectionedTextPrice(text, cialis, { strengthMg: 10, packQuantity: 8, generic: true })?.itemPricePence, 2499);
  assert.equal(readSectionedTextPrice(text, cialis, { strengthMg: 10, packQuantity: 8, generic: false })?.itemPricePence, 4499);
});

test("over-the-counter sections and medicines we don't compare never leak into other products", () => {
  assert.equal(readSectionedTextPrice(text, ["viagra connect", "sildenafil", "viagra"], { strengthMg: 50, packQuantity: 4, generic: false })?.itemPricePence, 2199);
  // Prescription Viagra 50mg × 4 isn't sold here; the Viagra Connect row must not stand in for it.
  assert.equal(readSectionedTextPrice(text, viagra, { strengthMg: 50, packQuantity: 4, generic: false }), undefined);
  // The Vardenafil rows (10mg × 8 at £24.99) sit below the branded Viagra section.
  assert.equal(readSectionedTextPrice(text, viagra, { strengthMg: 10, packQuantity: 8, generic: false }), undefined);
});
