import assert from "node:assert/strict";
import { test } from "node:test";

import type { PublicDiscount } from "@/types/comparison";

import { bestDiscount, discountSavingPence } from "./discounts";

function discount(id: string, overrides: Partial<PublicDiscount>): PublicDiscount {
  return { id, eligibility: "New customers", code: id.toUpperCase(), valueType: "PERCENT", valuePence: null, valuePercent: null, stackable: false, expiresAt: null, ...overrides };
}

test("savings come off the medicine price only, never below zero", () => {
  assert.equal(discountSavingPence(discount("p", { valuePercent: 10 }), 959), 96);
  assert.equal(discountSavingPence(discount("f", { valueType: "FIXED_AMOUNT", valuePence: 500 }), 300), 300);
  assert.equal(discountSavingPence(discount("z", { valuePercent: null }), 959), 0);
});

test("the single biggest saving wins; codes are not stacked", () => {
  const best = bestDiscount([discount("ten", { valuePercent: 10 }), discount("two", { valueType: "FIXED_AMOUNT", valuePence: 200 })], 1500);
  assert.equal(best?.discount.id, "two");
  assert.equal(best?.savingPence, 200);
  assert.equal(bestDiscount([], 1500), null);
});
