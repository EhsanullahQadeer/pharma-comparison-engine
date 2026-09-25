import assert from "node:assert/strict";
import test from "node:test";

import { pickPerTabletPriceTable } from "./per-tablet-price-table";

// Trimmed from a live Pharmica Viagra page: treatment + strength dropdowns and the inline table.
const html = `<h1>Viagra (Sildenafil)</h1>
<select name="ctl00$cphMain$ddlAlternate" id="cphMain_ddlAlternate"><option value="27899" data-treatment="generic">Sildenafil (Generic Viagra)</option><option value="27898" data-treatment="branded">Viagra (Branded - More Expensive)</option></select>
<select name="ctl00$cphMain$ddlTypes" id="cphMain_ddlTypes"><option value="34760" selected="selected">25mg (Low Dosage)</option><option value="34761">50mg (Standard Dosage)</option><option value="34762">100mg (High Dosage)</option></select>
<script> var prices = {}; prices[34757] = [[1,7.4975,1],[8,7.4988,1]];prices[34758] = [[1,8.7475,1],[8,8.7488,1]];prices[34759] = [[1,8.7475,1],[8,8.7488,1]];prices[34760] = [[1,3.995,1],[4,2.4975,1],[8,2.4988,1]];prices[34761] = [[1,4.995,1],[4,3.7475,1],[8,3.3739,1]];prices[34762] = [[1,5.495,1],[4,4.2475,1],[8,3.7488,1]];
function fn_UpdateAlternate() {
if($('#cphMain_ddlAlternate').val()==27898){$('#cphMain_ddlTypes').append($('<option>', { value: 34757, text: '25mg (Low Dosage)' }));};
if($('#cphMain_ddlAlternate').val()==27898){$('#cphMain_ddlTypes').append($('<option>', { value: 34758, text: '50mg (Standard Dosage)',selected: 'selected' }));};
if($('#cphMain_ddlAlternate').val()==27898){$('#cphMain_ddlTypes').append($('<option>', { value: 34759, text: '100mg (High Dosage)' }));};
if($('#cphMain_ddlAlternate').val()==27899){$('#cphMain_ddlTypes').append($('<option>', { value: 34760, text: '25mg (Low Dosage)' }));};
if($('#cphMain_ddlAlternate').val()==27899){$('#cphMain_ddlTypes').append($('<option>', { value: 34761, text: '50mg (Standard Dosage)',selected: 'selected' }));};
if($('#cphMain_ddlAlternate').val()==27899){$('#cphMain_ddlTypes').append($('<option>', { value: 34762, text: '100mg (High Dosage)' }));};
}</script>`;
const tokens = ["viagra", "sildenafil"];
const url = "https://www.pharmica.co.uk/erectile-dysfunction/viagra/";

test("prices a pack as size × per-tablet price for the right treatment and strength", () => {
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 100, packQuantity: 8, generic: true }, url)?.itemPricePence, 2999);
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 25, packQuantity: 4, generic: true }, url)?.itemPricePence, 999);
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 50, packQuantity: 8, generic: false }, url)?.itemPricePence, 6999);
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 100, packQuantity: 8, generic: true }, url)?.source, "per-tablet-price-table");
});

test("refuses packs the treatment doesn't sell and pages without a table", () => {
  // Branded Viagra here comes as 1 or 8+ tablets — no 4-pack.
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
  assert.equal(pickPerTabletPriceTable("<h1>Viagra</h1>", tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
});
