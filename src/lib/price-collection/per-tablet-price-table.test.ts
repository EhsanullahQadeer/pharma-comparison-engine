import assert from "node:assert/strict";
import test from "node:test";

import { pickPerTabletPriceTable } from "./per-tablet-price-table";

// Trimmed from live Pharmica pages: generic/branded, strength and quantity dropdowns, and the
// script that fills them and holds the price bands.
const quantities = `<select name="ctl00$cphMain$ddlQuantity" id="cphMain_ddlQuantity"><option selected="selected" value="4">4 tablets</option><option value="8">8 tablets</option><option value="12">12 tablets</option></select>`;
const html = `<h1>Viagra (Sildenafil)</h1>
<select name="ctl00$cphMain$ddlAlternate" id="cphMain_ddlAlternate"><option value="27899" data-treatment="generic">Sildenafil (Generic Viagra)</option><option value="27898" data-treatment="branded">Viagra (Branded - More Expensive)</option></select>
<select name="ctl00$cphMain$ddlTypes" id="cphMain_ddlTypes"><option value="34760" selected="selected">25mg (Low Dosage)</option><option value="34761">50mg (Standard Dosage)</option><option value="34762">100mg (High Dosage)</option></select>
${quantities}
<script> var prices = {}; prices[34757] = [[1,7.4975,1],[8,7.4988,1]];prices[34758] = [[1,8.7475,1],[8,8.7488,1]];prices[34759] = [[1,8.7475,0],[8,8.7488,1]];prices[34760] = [[1,3.995,1],[4,2.4975,1],[8,2.4988,1]];prices[34761] = [[1,4.995,1],[4,3.7475,1],[8,3.3739,1]];prices[34762] = [[1,5.495,1],[4,4.2475,1],[8,3.7488,1]];
var discount = 0;
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

test("prices a pack as quantity × the per-tablet price of the band it reaches", () => {
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 100, packQuantity: 8, generic: true }, url)?.itemPricePence, 2999);
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 25, packQuantity: 4, generic: true }, url)?.itemPricePence, 999);
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 50, packQuantity: 8, generic: false }, url)?.itemPricePence, 6999);
  // A band's starting quantity isn't a pack size: 4 and 12 branded tablets sit in the "from 1" and "from 8" bands.
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url)?.itemPricePence, 3499);
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 50, packQuantity: 12, generic: false }, url)?.itemPricePence, 10499);
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 100, packQuantity: 8, generic: true }, url)?.source, "per-tablet-price-table");
});

test("only quantities the dropdown offers are priced, and a band's stock flag is kept", () => {
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 50, packQuantity: 1, generic: false }, url), undefined);
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 50, packQuantity: 16, generic: false }, url), undefined);
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 100, packQuantity: 4, generic: false }, url)?.availability, "OUT_OF_STOCK");
  assert.equal(pickPerTabletPriceTable(html, tokens, { strengthMg: 100, packQuantity: 8, generic: false }, url)?.availability, "IN_STOCK");
  assert.equal(pickPerTabletPriceTable("<h1>Viagra</h1>", tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
  // A promotion taken off the worked-out price is left to the page itself.
  assert.equal(pickPerTabletPriceTable(html.replace("var discount = 0;", "var discount = 5;"), tokens, { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
});

// Cialis Together: no strength dropdown, the branded choice has one strength and the generic two.
const together = `<h1>Cialis Together</h1>
<select name="ctl00$cphMain$ddlAlternate" id="cphMain_ddlAlternate"> <option value="27957" data-treatment="generic">Tadalafil (Generic Cialis Together)</option> <option value="28197" data-treatment="branded">Cialis Together (Branded)</option> </select>
${quantities}
<input type="hidden" name="ctl00$cphMain$hfVarId" id="cphMain_hfVarId" value="35270">
<script> var prices = {}; prices[34851] = [[1,4.9975,1],[8,3.7488,1]];prices[34859] = [[1,4.9975,1],[8,3.7488,1]];prices[35270] = [[1,5.497,1],[5,4.7487,1],[9,4.749,1]];
if($('#cphMain_ddlAlternate').val()==28197){$('#cphMain_ddlTypes').append($('<option>', { value: 35270, text: '10mg' }));};
if($('#cphMain_ddlAlternate').val()==27957){$('#cphMain_ddlTypes').append($('<option>', { value: 34851, text: '10mg (Standard Dosage - 36 Hour)',selected: 'selected' }));};
if($('#cphMain_ddlAlternate').val()==27957){$('#cphMain_ddlTypes').append($('<option>', { value: 34859, text: '20mg (High Dosage - 36 Hour)' }));};
</script>`;
const togetherUrl = "https://www.pharmica.co.uk/erectile-dysfunction/cialis-together/";

test("a single-strength product is priced from the quantity dropdown (Cialis Together)", () => {
  const togetherTokens = ["cialis together", "tadalafil", "cialis"];
  assert.equal(pickPerTabletPriceTable(together, togetherTokens, { strengthMg: 10, packQuantity: 4, generic: false }, togetherUrl)?.itemPricePence, 2199);
  assert.equal(pickPerTabletPriceTable(together, togetherTokens, { strengthMg: 10, packQuantity: 8, generic: false }, togetherUrl)?.itemPricePence, 3799);
  assert.equal(pickPerTabletPriceTable(together, togetherTokens, { strengthMg: 10, packQuantity: 1, generic: false }, togetherUrl), undefined);
  // Its generic choice has two strengths and no strength dropdown to say which is sold, and the
  // page is never prescription Cialis.
  assert.equal(pickPerTabletPriceTable(together, ["tadalafil", "cialis"], { strengthMg: 10, packQuantity: 4, generic: true }, togetherUrl), undefined);
  assert.equal(pickPerTabletPriceTable(together, ["cialis", "tadalafil"], { strengthMg: 10, packQuantity: 4, generic: false }, togetherUrl), undefined);
});

// Daily tadalafil: a page without a generic/branded choice, and a strength with its own quantity list.
const tadalafil = `<h1>Tadalafil (Generic Cialis)</h1>
<select name="ctl00$cphMain$ddlTypes" id="cphMain_ddlTypes"><option value="34860">2.5mg (Low Dosage - Daily)</option><option value="34861">5mg (Standard Dosage - Daily)</option><option value="34851" selected="selected">10mg (Standard Dosage - 36 Hour)</option></select>
${quantities}
<script> var prices = {}; prices[34851] = [[1,4.9975,1],[8,3.7488,1]];prices[34860] = [[1,1.2496,0],[56,1.2498,0]];prices[34861] = [[1,1.2496,1],[56,1.2498,1],[84,1.1904,1]];
function fn_UpdateQuantities() {
if($('#cphMain_ddlTypes').val()==34861){$('#cphMain_ddlQuantity').empty(); $('#cphMain_ddlQuantity').append($('<option>', { value: 28, text: '1 month (28 tablets)',selected: 'selected' })); $('#cphMain_ddlQuantity').append($('<option>', { value: 56, text: '2 months (56 tablets)' })); };
if($('#cphMain_ddlTypes').val()==34851){$('#cphMain_ddlQuantity').empty(); $('#cphMain_ddlQuantity').append($('<option>', { value: 4, text: '4 tablets',selected: 'selected'})); $('#cphMain_ddlQuantity').append($('<option>', { value: 8, text: '8 tablets'})); };
}</script>`;

test("a strength with its own quantity list uses that list (daily tadalafil)", () => {
  const tadalafilTokens = ["tadalafil", "cialis"];
  const tadalafilUrl = "https://www.pharmica.co.uk/erectile-dysfunction/tadalafil/";
  assert.equal(pickPerTabletPriceTable(tadalafil, tadalafilTokens, { strengthMg: 5, packQuantity: 28, generic: true }, tadalafilUrl)?.itemPricePence, 3499);
  assert.equal(pickPerTabletPriceTable(tadalafil, tadalafilTokens, { strengthMg: 5, packQuantity: 56, generic: true }, tadalafilUrl)?.itemPricePence, 6999);
  assert.equal(pickPerTabletPriceTable(tadalafil, tadalafilTokens, { strengthMg: 10, packQuantity: 8, generic: true }, tadalafilUrl)?.itemPricePence, 2999);
  // Daily tablets aren't sold in 4s, 36-hour ones not in 12s here, and the page is generic only.
  assert.equal(pickPerTabletPriceTable(tadalafil, tadalafilTokens, { strengthMg: 5, packQuantity: 4, generic: true }, tadalafilUrl), undefined);
  assert.equal(pickPerTabletPriceTable(tadalafil, tadalafilTokens, { strengthMg: 10, packQuantity: 12, generic: true }, tadalafilUrl), undefined);
  assert.equal(pickPerTabletPriceTable(tadalafil, ["cialis", "tadalafil"], { strengthMg: 10, packQuantity: 8, generic: false }, tadalafilUrl), undefined);
});
