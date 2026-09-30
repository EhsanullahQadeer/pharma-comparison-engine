import assert from "node:assert/strict";
import test from "node:test";

import { pickPriceTableColumns } from "./price-table-columns";

// Trimmed from Zava's Viagra page: a cross-sell card for generic sildenafil above the page's own
// "Prices" block (one column per strength, one line per pack).
const column = (strength: string, lines: string[]) => `<div class="PriceTable-column"> <div class="PriceTable-columnContent"> <strong class="PriceTable-columnTitle">${strength}</strong> <div class="PriceTable-description"> ${lines.map((line) => `<p>${line}</p>`).join("")} </div> </div> </div>`;
const zavaViagra = `<h1 class="Hero-title">Viagra</h1>
<div class="Card"><p>Generic sildenafil – 4 tablets</p><p>Sildenafil 4 tablet(s) - 50 mg £12.00 (£3.00/tablet)</p></div>
<div class="PriceTable u-sectionBlock"><h2>Prices</h2><div class="Row PriceTable-columns">
${column("25 mg", ["4 tablet(s) - £30.00", "8 tablet(s) - £50.00"])}
${column("50 mg", ["4 tablet(s) - £30.00", "8 tablet(s) - £49.00"])}
${column("100 mg", ["4 tablet(s) - £37.99"])}
</div><a class="Button PriceTable-cta" href="/uk/assessment/48">Get started</a></div><p>4 tablet(s) - £1.00</p>`;
const tokens = ["viagra", "sildenafil"];
const url = "https://www.zavamed.com/uk/viagra.html";

test("reads the exact strength column and pack line", () => {
  assert.equal(pickPriceTableColumns(zavaViagra, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url)?.itemPricePence, 3000);
  assert.equal(pickPriceTableColumns(zavaViagra, tokens, { strengthMg: 50, packQuantity: 8, generic: false }, url)?.itemPricePence, 4900);
  assert.equal(pickPriceTableColumns(zavaViagra, tokens, { strengthMg: 100, packQuantity: 4, generic: false }, url)?.itemPricePence, 3799);
  assert.equal(pickPriceTableColumns(zavaViagra, tokens, { strengthMg: 100, packQuantity: 8, generic: false }, url), undefined);
});

test("never prices the generic side from a branded page or reads text outside the Prices block", () => {
  assert.equal(pickPriceTableColumns(zavaViagra, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, url), undefined);
  const generic = zavaViagra.replace("<h1 class=\"Hero-title\">Viagra</h1>", "<h1>Sildenafil tablets</h1>");
  assert.equal(pickPriceTableColumns(generic, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, url)?.itemPricePence, 3000);
});
