import assert from "node:assert/strict";
import test from "node:test";

import { pickFeedVariantPrice } from "./feed-price";
import { labelMatchesVariant } from "./variant-label";
import { parseFeedText } from "../product-detection/site-feeds";

const base = new URL("https://pharmacy.example");
const variant = { strengthMg: 50, packQuantity: 8 };
const tokens = ["sildenafil", "viagra"];

function feed(items: string) {
  return `<?xml version="1.0"?><rss xmlns:g="http://base.google.com/ns/1.0"><channel>${items}</channel></rss>`;
}

test("labelMatchesVariant requires the exact strength and pack size", () => {
  assert.equal(labelMatchesVariant("Sildenafil 50mg 8 Tablets", tokens, variant), true);
  assert.equal(labelMatchesVariant("Sildenafil 50mg x 8", tokens, variant), true);
  assert.equal(labelMatchesVariant("Sildenafil 100mg 8 Tablets", tokens, variant), false);
  assert.equal(labelMatchesVariant("Sildenafil 50mg 4 Tablets", tokens, variant), false);
  assert.equal(labelMatchesVariant("Sildenafil 50mg", tokens, variant), false);
  assert.equal(labelMatchesVariant("Tadalafil 50mg 8 Tablets", tokens, variant), false);
  assert.equal(labelMatchesVariant("Sildenafil 25mg, 50mg 8 Tablets", tokens, variant), false);
});

test("Google Merchant feed price is read in GBP, with shipping kept separate", () => {
  const { items } = parseFeedText(feed(`<item>
    <g:title>Sildenafil 50mg 8 Tablets</g:title>
    <g:link>https://pharmacy.example/sildenafil</g:link>
    <g:price>19.99 GBP</g:price>
    <g:availability>in stock</g:availability>
    <g:shipping><g:country>GB</g:country><g:price>3.95 GBP</g:price></g:shipping>
  </item>`), base);
  const price = pickFeedVariantPrice(items, tokens, variant);
  assert.equal(price?.itemPricePence, 1999);
  assert.equal(price?.deliveryFeePence, 395);
  assert.equal(price?.availability, "IN_STOCK");
  assert.equal(price?.source, "merchant-feed");
  assert.equal(price?.sourceUrl, "https://pharmacy.example/sildenafil");
});

test("an active sale price wins; an expired one is ignored", () => {
  const item = (dates: string) => `<item><g:title>Sildenafil 50mg 8 Tablets</g:title><g:link>https://pharmacy.example/s</g:link>
    <g:price>19.99 GBP</g:price><g:sale_price>14.99 GBP</g:sale_price>${dates}</item>`;
  assert.equal(pickFeedVariantPrice(parseFeedText(feed(item("")), base).items, tokens, variant)?.itemPricePence, 1499);
  const expired = "<g:sale_price_effective_date>2020-01-01T00:00+0000/2020-02-01T00:00+0000</g:sale_price_effective_date>";
  assert.equal(pickFeedVariantPrice(parseFeedText(feed(item(expired)), base).items, tokens, variant)?.itemPricePence, 1999);
});

test("non-GBP, unmarked or conflicting feed prices are not used", () => {
  const item = (title: string, price: string, path = "s") => `<item><g:title>${title}</g:title><g:link>https://pharmacy.example/${path}</g:link><g:price>${price}</g:price></item>`;
  assert.equal(pickFeedVariantPrice(parseFeedText(feed(item("Sildenafil 50mg 8 Tablets", "19.99 USD")), base).items, tokens, variant), undefined);
  assert.equal(pickFeedVariantPrice(parseFeedText(feed(item("Sildenafil 50mg 8 Tablets", "19.99")), base).items, tokens, variant), undefined);
  const conflicting = item("Sildenafil 50mg 8 Tablets", "19.99 GBP", "a") + item("Viagra 50mg 8 Tablets", "49.99 GBP", "b");
  assert.equal(pickFeedVariantPrice(parseFeedText(feed(conflicting), base).items, tokens, variant), undefined);
});
