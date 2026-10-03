import assert from "node:assert/strict";
import test from "node:test";

import { pickPackBlockPrice } from "./pack-block-prices";

// Trimmed from Your Pharmacy's Elementor product pages: a heading per pack size, then a tab per
// strength and each strength's price in the same order.
const block = (pack: string, strengths: string[], prices: string[]) => `<h2 class="elementor-heading-title">Pack Size &#8211; ${pack} tablets </h2>
<ul class="nav nav-tabs" role="tablist">${strengths.map((strength) => `<li><a class="elementkit-nav-link" role="tab"><span class="elementskit-tab-title"> ${strength} </span></a></li>`).join("")}</ul>
<div class="tab-content">${prices.map((price) => `<div class="tab-pane"><p>${price}</p></div>`).join("")}</div>`;
const page = (heading: string, blocks: string) => `<h1>${heading}</h1><p>£24.95 - £63.95</p>${blocks}<a>Continue to Assessment</a>`;
const url = "https://yourpharmacy.uk/viagra/";
const viagraPage = page("viagra for Erectile Dysfunction treatment", block("4", ["25mg", "50mg", "100mg"], ["&pound;24.95", "£29.95", "£33.50"]) + block("8", ["25mg", "50mg", "100mg"], ["£43.95", "£58.95", "£63.95"]));
const viagra = ["viagra", "sildenafil"];

test("pairs each strength with its price inside the pack's block", () => {
  assert.equal(pickPackBlockPrice(viagraPage, viagra, { strengthMg: 50, packQuantity: 4, generic: false }, url)?.itemPricePence, 2995);
  assert.equal(pickPackBlockPrice(viagraPage, viagra, { strengthMg: 100, packQuantity: 8, generic: false }, url)?.itemPricePence, 6395);
  assert.equal(pickPackBlockPrice(viagraPage, viagra, { strengthMg: 25, packQuantity: 4, generic: false }, url)?.itemPricePence, 2495);
  // Not a pack on the page, and the price range above the blocks is never read.
  assert.equal(pickPackBlockPrice(viagraPage, viagra, { strengthMg: 50, packQuantity: 16, generic: false }, url), undefined);
});

test("the page heading decides branded, generic and over-the-counter", () => {
  assert.equal(pickPackBlockPrice(viagraPage, viagra, { strengthMg: 50, packQuantity: 4, generic: true }, url), undefined);
  const generic = page("sildenafil for erectile dysfunction treatments", block("4", ["25mg", "50mg", "100mg"], ["£5.89", "£7.49", "£8.19"]));
  assert.equal(pickPackBlockPrice(generic, viagra, { strengthMg: 50, packQuantity: 4, generic: true }, url)?.itemPricePence, 749);
  const connect = page("viagra connect 50mg for Erectile Dysfunction treatment", block("4", ["50mg"], ["£22.50"]));
  assert.equal(pickPackBlockPrice(connect, ["viagra connect", "sildenafil", "viagra"], { strengthMg: 50, packQuantity: 4, generic: false }, url)?.itemPricePence, 2250);
  assert.equal(pickPackBlockPrice(connect, viagra, { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
});

test("a block whose strengths and prices don't pair up is ignored", () => {
  const uneven = page("viagra for Erectile Dysfunction treatment", block("4", ["25mg", "50mg", "100mg"], ["£24.95", "£29.95"]));
  assert.equal(pickPackBlockPrice(uneven, viagra, { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
});
