import assert from "node:assert/strict";
import test from "node:test";

import { pickPageVariantPrice } from "./scrape-price";

// Trimmed from Live Well Nationwide: the JSON-LD product is named with the page's SEO title, the
// exact pack only appears in the <h1>.
const url = "https://livewellnationwide.co.uk/viagra-connect-50mg-tablets-2-pack-branded-sildenafil/";
const page = (offers: unknown, heading = "Viagra Connect (50mg) Tablets 2 Pack (Branded Sildenafil)") => `<h1 class="product_title">${heading}</h1>
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "WebSite", name: "Live Well Nationwide" }, { "@type": "Product", name: "Buy Viagra Connect Online | Live Well Nationwide", offers }] })}</script>`;
const offer = { "@type": "Offer", price: "10.85", priceCurrency: "GBP", availability: "http://schema.org/InStock", url };
const connect = ["viagra connect", "sildenafil", "viagra"];

test("a single-product page's heading names the pack its one offer is for", () => {
  const result = pickPageVariantPrice(page(offer), connect, { strengthMg: 50, packQuantity: 2, generic: false }, url);
  assert.equal(result?.itemPricePence, 1085);
  assert.equal(result?.availability, "IN_STOCK");
  // Another pack, or the prescription product, is never priced from it.
  assert.equal(pickPageVariantPrice(page(offer), connect, { strengthMg: 50, packQuantity: 4, generic: false }, url), undefined);
  assert.equal(pickPageVariantPrice(page(offer), ["viagra", "sildenafil"], { strengthMg: 50, packQuantity: 2, generic: false }, url), undefined);
});

test("the heading is not used for a price range, several offers or an offer for another page", () => {
  const spec = { strengthMg: 50, packQuantity: 2, generic: false };
  assert.equal(pickPageVariantPrice(page({ "@type": "AggregateOffer", lowPrice: "10.85", highPrice: "38.99", priceCurrency: "GBP" }), connect, spec, url), undefined);
  assert.equal(pickPageVariantPrice(page([offer, { ...offer, price: "21.95" }]), connect, spec, url), undefined);
  assert.equal(pickPageVariantPrice(page({ ...offer, url: "https://livewellnationwide.co.uk/erectile-dysfunction-viagra-connect/" }), connect, spec, url), undefined);
});
