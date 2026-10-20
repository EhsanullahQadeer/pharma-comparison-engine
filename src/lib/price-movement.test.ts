import assert from "node:assert/strict";
import { test } from "node:test";

import { priceMoved, priceMovement, sparklineGeometry } from "./price-movement";

test("change is against the previous check; unchanged or first checks show nothing", () => {
  assert.deepEqual(priceMovement(959, { recentPence: [959, 979], low30Pence: 959, high30Pence: 979 }), { priceChangePence: -20, thirtyDayLow: true });
  assert.deepEqual(priceMovement(1414, { recentPence: [1414, 1404], low30Pence: 1404, high30Pence: 1414 }), { priceChangePence: 10, thirtyDayLow: false });
  assert.deepEqual(priceMovement(500, { recentPence: [500, 500], low30Pence: 500, high30Pence: 500 }), { priceChangePence: null, thirtyDayLow: false });
  assert.deepEqual(priceMovement(500, { recentPence: [500], low30Pence: 500, high30Pence: 500 }), { priceChangePence: null, thirtyDayLow: false });
  assert.deepEqual(priceMovement(500, { recentPence: [], low30Pence: null, high30Pence: null }), { priceChangePence: null, thirtyDayLow: false });
});

test("an offer edited after its latest check compares against that check", () => {
  assert.equal(priceMovement(900, { recentPence: [1000, 950], low30Pence: 950, high30Pence: 1000 }).priceChangePence, -100);
});

const day = (date: string, pence: number) => ({ day: new Date(`${date}T00:00:00Z`), pence });

test("sparkline steps by date across the box, highest price at the top", () => {
  const points = [day("2026-08-01", 1000), day("2026-08-11", 800), day("2026-08-21", 900)];
  const { coords, path, low, high } = sparklineGeometry(points, 100, 20, 0);
  assert.deepEqual(coords.map((c) => [c.x, c.y]), [[0, 0], [50, 20], [100, 10]]);
  assert.equal(path, "M0.0,0.0H50.0V20.0H100.0V10.0");
  assert.deepEqual([low, high], [800, 1000]);
});

test("only a price that changed gets a sparkline", () => {
  assert.equal(priceMoved([day("2026-08-01", 500), day("2026-08-02", 500)]), false);
  assert.equal(priceMoved([day("2026-08-01", 500), day("2026-08-02", 450)]), true);
  assert.equal(priceMoved([]), false);
});
