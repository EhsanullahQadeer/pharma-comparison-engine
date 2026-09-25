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

test("reads the transposed layout and respects the product's branded/generic side", () => {
  const transposed = `<h1>Tadalafil Tablets</h1><table><tr><th>Strength</th><th>4 tablets</th><th>28 tablets</th></tr><tr><td>5mg</td><td>-</td><td>£19.35</td></tr></table>`;
  const tadalafil = ["cialis", "tadalafil"];
  assert.equal(pickPriceGridTable(transposed, tadalafil, { strengthMg: 5, packQuantity: 28, generic: true }, url)?.itemPricePence, 1935);
  assert.equal(pickPriceGridTable(transposed, tadalafil, { strengthMg: 5, packQuantity: 28, generic: false }, url), undefined);
});
