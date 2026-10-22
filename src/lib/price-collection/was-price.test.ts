import assert from "node:assert/strict";
import { test } from "node:test";

import { strikethroughPence } from "@/lib/price-collection/scrape-price";
import { agreedWasPrice, saleWasPricePence, wasPriceField } from "@/lib/price-collection/was-price";

test("a was price is kept only when it reads as a real sale", () => {
  assert.equal(saleWasPricePence(1999, 2499), 2499);
  assert.equal(saleWasPricePence(1999, undefined), null);
  assert.equal(saleWasPricePence(1999, 1999), null, "same price is no sale");
  assert.equal(saleWasPricePence(1999, 1500), null, "below the current price");
  assert.equal(saleWasPricePence(1000, 3001), null, "more than three times the price");
  assert.equal(saleWasPricePence(1000, 3000), 3000);
});

test("every collection writes the field, so an ended sale clears it", () => {
  assert.deepEqual(wasPriceField({ itemPricePence: 1999 }), { wasPricePence: null });
  assert.deepEqual(wasPriceField({ itemPricePence: 1999, wasPricePence: 2499 }), { wasPricePence: 2499 });
});

test("offers that agree on a price must also agree on its was price", () => {
  assert.equal(agreedWasPrice([{ wasPricePence: 2499 }, { wasPricePence: 2499 }]), 2499);
  assert.equal(agreedWasPrice([{ wasPricePence: 2499 }, {}]), undefined);
  assert.equal(agreedWasPrice([{ wasPricePence: 2499 }, { wasPricePence: 2999 }]), undefined);
});

test("JSON-LD strikethrough and list prices are read as was prices", () => {
  const strike = { price: "19.99", priceCurrency: "GBP", priceSpecification: [{ "@type": "UnitPriceSpecification", priceType: "https://schema.org/StrikethroughPrice", price: "24.99", priceCurrency: "GBP" }] };
  assert.equal(strikethroughPence(strike), 2499);
  assert.equal(strikethroughPence({ priceSpecification: { "@type": "UnitPriceSpecification", priceType: "http://schema.org/ListPrice", price: 30 } }), 3000);
  assert.equal(strikethroughPence({ priceSpecification: { "@type": "UnitPriceSpecification", priceType: "https://schema.org/SalePrice", price: 30 } }), undefined);
  assert.equal(strikethroughPence({ priceSpecification: { priceType: "https://schema.org/StrikethroughPrice", price: 30, priceCurrency: "EUR" } }), undefined);
  assert.equal(strikethroughPence({ price: "19.99" }), undefined);
});
