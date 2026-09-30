import assert from "node:assert/strict";
import test from "node:test";

import { pickPriceGridTable } from "./price-grid-table";

// Trimmed from Oxford Online Pharmacy's "Our Prices" table (strengths across, packs down, "-" = not sold).
const oxfordViagra = `<h1>Viagra Tablets (25mg, 50mg, 100mg)</h1><table><thead><tr><th></th><th>25mg</th><th>50mg</th><th>100mg</th></tr></thead>
<tbody><tr><td>4 tablets</td><td> - </td><td> &pound;29.94 </td><td> £33.49 </td></tr><tr><td>8 tablets</td><td> £43.94 </td><td> £58.94 </td><td> £63.94 </td></tr></tbody></table>`;
const tokens = ["viagra", "sildenafil"];
const url = "https://www.oxfordonlinepharmacy.co.uk/erectile-dysfunction/viagra";

test("reads the cell for the exact strength and pack; '-' is not sold", () => {
  assert.equal(pickPriceGridTable(oxfordViagra, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url)?.itemPricePence, 2994);
  assert.equal(pickPriceGridTable(oxfordViagra, tokens, { strengthMg: 100, packQuantity: 8, generic: false }, url)?.itemPricePence, 6394);
  assert.equal(pickPriceGridTable(oxfordViagra, tokens, { strengthMg: 25, packQuantity: 4, generic: false }, url), undefined);
});

// Trimmed from Somer Pharmacy's TablePress table: no <h1> (the page title names the product), a
// "Quantity" column of bare counts and bare "29.99" prices with no £ sign.
const somerViagra = `<title>Viagra &#8211; Somer Pharmacy</title><h2>Viagra</h2><h3>Pricing from £25.99</h3>
<table id="tablepress-1" class="tablepress"><thead><tr><th class="column-1">Quantity</th><th>25mg</th><th>50mg</th><th>100mg</th></tr></thead>
<tbody><tr><td class="column-1">4</td><td>29.99</td><td>33.99</td><td>34.99</td></tr><tr><td class="column-1">8</td><td>49.99</td><td>59.99</td><td>69.99</td></tr></tbody></table>`;
const somerUrl = "https://somerpharmacy.co.uk/mens-health/erectile-dysfunction/viagra/";

test("reads a 'Quantity' column of bare counts with bare prices, naming the product from the page title", () => {
  assert.equal(pickPriceGridTable(somerViagra, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, somerUrl)?.itemPricePence, 3399);
  assert.equal(pickPriceGridTable(somerViagra, tokens, { strengthMg: 100, packQuantity: 8, generic: false }, somerUrl)?.itemPricePence, 6999);
  assert.equal(pickPriceGridTable(somerViagra, tokens, { strengthMg: 50, packQuantity: 16, generic: false }, somerUrl), undefined);
  assert.equal(pickPriceGridTable(somerViagra, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, somerUrl), undefined);
});

test("decides branded or generic per row when the rows say so (Dr Fox)", () => {
  // Generic and branded rows in one table; branded packs of 32 are "n/a" and must never be filled
  // with the generic price.
  const drFox = `<h1>Viagra</h1><table><tr><th>Tablet type</th><th>4 tablets</th><th>32 tablets</th></tr>
<tr><td>Generic Viagra 25mg</td><td>&pound;3.20</td><td>&pound;22.00</td></tr>
<tr><td>Viagra 25mg</td><td>&pound;24.20</td><td>n/a</td></tr></table>`;
  const url = "https://www.doctorfox.co.uk/erectile-dysfunction/viagra.html";
  assert.equal(pickPriceGridTable(drFox, tokens, { strengthMg: 25, packQuantity: 4, generic: false }, url)?.itemPricePence, 2420);
  assert.equal(pickPriceGridTable(drFox, tokens, { strengthMg: 25, packQuantity: 4, generic: true }, url)?.itemPricePence, 320);
  assert.equal(pickPriceGridTable(drFox, tokens, { strengthMg: 25, packQuantity: 32, generic: false }, url), undefined);
  assert.equal(pickPriceGridTable(drFox, tokens, { strengthMg: 25, packQuantity: 32, generic: true }, url)?.itemPricePence, 2200);
});

test("rows naming their own product are that product, not the page's (Dr Fox Viagra Connect / Cialis Together)", () => {
  const connect = `<h1>Viagra Connect</h1><table><tr><th>Tablet type</th><th>4 tablets</th><th>8 tablets</th></tr>
<tr><td>Sildenafil 50mg</td><td>&pound;3.50</td><td>&pound;9.80</td></tr>
<tr><td>Viagra Connect 50mg</td><td>&pound;19.99</td><td>&pound;34.99</td></tr></table>`;
  const url = "https://www.doctorfox.co.uk/erectile-dysfunction/viagra-connect-tablets.html";
  const connectTokens = ["viagra connect", "sildenafil", "viagra"];
  assert.equal(pickPriceGridTable(connect, connectTokens, { strengthMg: 50, packQuantity: 4, generic: false }, url)?.itemPricePence, 1999);
  // The generic sildenafil row is never prescription Viagra or Viagra Connect.
  assert.equal(pickPriceGridTable(connect, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
  assert.equal(pickPriceGridTable(connect, tokens, { strengthMg: 50, packQuantity: 4, generic: true }, url)?.itemPricePence, 350);

  const together = `<h1>Cialis Together</h1><table><tr><th>Tablet type</th><th>4 tablets</th></tr>
<tr><td>Generic 10mg tadalafil</td><td>&pound;7.95</td></tr><tr><td>Cialis Together (10mg tadalafil)</td><td>&pound;16.00</td></tr></table>`;
  assert.equal(pickPriceGridTable(together, ["cialis together", "tadalafil", "cialis"], { strengthMg: 10, packQuantity: 4, generic: false }, url)?.itemPricePence, 1600);
  assert.equal(pickPriceGridTable(together, ["cialis", "tadalafil"], { strengthMg: 10, packQuantity: 4, generic: false }, url), undefined);
  assert.equal(pickPriceGridTable(together, ["cialis", "tadalafil"], { strengthMg: 10, packQuantity: 4, generic: true }, url)?.itemPricePence, 795);
});

test("reads every price table on the page, not just the first", () => {
  // Somer Pharmacy's tadalafil page: an on-demand table (packs of 4–8) then a daily one (28–56).
  const somerTadalafil = `<title>Tadalafil &#8211; Somer Pharmacy</title>
<h4>Tadalafil Pricing</h4><table><thead><tr><th>Quantity</th><th>10mg</th><th>20mg</th></tr></thead><tbody><tr><td>4</td><td>19.99</td><td>21.99</td></tr><tr><td>8</td><td>29.99</td><td>31.99</td></tr></tbody></table>
<h4>Tadalafil Daily Pricing</h4><table><thead><tr><th>Quantity</th><th>10mg</th><th>20mg</th></tr></thead><tbody><tr><td>28</td><td>34.99</td><td>36.99</td></tr><tr><td>56</td><td>59.99</td><td>61.99</td></tr></tbody></table>`;
  const tadalafil = ["cialis", "tadalafil"];
  assert.equal(pickPriceGridTable(somerTadalafil, tadalafil, { strengthMg: 10, packQuantity: 4, generic: true }, somerUrl)?.itemPricePence, 1999);
  assert.equal(pickPriceGridTable(somerTadalafil, tadalafil, { strengthMg: 20, packQuantity: 56, generic: true }, somerUrl)?.itemPricePence, 6199);
});

test("ignores bare counts when the first column isn't headed as a quantity", () => {
  const unlabelled = somerViagra.replace(">Quantity<", "><");
  assert.equal(pickPriceGridTable(unlabelled, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, somerUrl), undefined);
});

test("reads the transposed layout and respects the product's branded/generic side", () => {
  const transposed = `<h1>Tadalafil Tablets</h1><table><tr><th>Strength</th><th>4 tablets</th><th>28 tablets</th></tr><tr><td>5mg</td><td>-</td><td>£19.35</td></tr></table>`;
  const tadalafil = ["cialis", "tadalafil"];
  assert.equal(pickPriceGridTable(transposed, tadalafil, { strengthMg: 5, packQuantity: 28, generic: true }, url)?.itemPricePence, 1935);
  assert.equal(pickPriceGridTable(transposed, tadalafil, { strengthMg: 5, packQuantity: 28, generic: false }, url), undefined);
});
