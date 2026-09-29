import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyJobFailure } from "@/lib/price-collection/job-retry";
import { impossiblePriceReason } from "@/lib/price-collection/price-sanity";

test("ordinary price changes go live, even large ones", () => {
  assert.equal(impossiblePriceReason({ itemPricePence: 2400, packQuantity: 4, previousItemPricePence: 2400 }), null);
  assert.equal(impossiblePriceReason({ itemPricePence: 1200, packQuantity: 4, previousItemPricePence: 2400 }), null);
  assert.equal(impossiblePriceReason({ itemPricePence: 3600, packQuantity: 4, previousItemPricePence: 2400 }), null);
  assert.equal(impossiblePriceReason({ itemPricePence: 1599, packQuantity: 28 }), null);
});

test("first price for an offer is only checked against the per-tablet floor", () => {
  assert.equal(impossiblePriceReason({ itemPricePence: 2400, packQuantity: 4, previousItemPricePence: null }), null);
  assert.match(impossiblePriceReason({ itemPricePence: 24, packQuantity: 4 }) ?? "", /under 10p a tablet/);
});

test("zero or negative prices are refused", () => {
  assert.ok(impossiblePriceReason({ itemPricePence: 0, packQuantity: 4 }));
  assert.ok(impossiblePriceReason({ itemPricePence: -100, packQuantity: 4 }));
});

// Real bad scrapes recorded for Well, Viagra 50mg x4 (correct price £24.00).
test("the 24p and 96p Well scrapes would have been refused", () => {
  assert.match(impossiblePriceReason({ itemPricePence: 24, packQuantity: 4, previousItemPricePence: 2400 }) ?? "", /under 10p a tablet/);
  assert.match(impossiblePriceReason({ itemPricePence: 96, packQuantity: 4, previousItemPricePence: 2400 }) ?? "", /more than 5×/);
});

test("a jump of more than 5x upwards is refused too", () => {
  assert.ok(impossiblePriceReason({ itemPricePence: 12_100, packQuantity: 4, previousItemPricePence: 2400 }));
});

test("a refused price is a final failure, never retried", () => {
  const reason = impossiblePriceReason({ itemPricePence: 96, packQuantity: 4, previousItemPricePence: 2400 }) ?? "";
  assert.equal(classifyJobFailure(reason, 1), "FAILED");
});
