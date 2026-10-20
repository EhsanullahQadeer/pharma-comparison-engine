import assert from "node:assert/strict";
import { test } from "node:test";

import type { PublicOffer } from "@/types/comparison";

import { alertDecision, confirmationEmail, lowestTotalPence, parseAlertTarget, priceAlertOptions, priceDropEmail } from "./price-alerts";

const now = new Date("2026-10-20T12:00:00Z");
const HOUR = 60 * 60 * 1000;

function offer(id: string, strengthMg: number, packQuantity: number, deliveredTotalPence: number, availability: PublicOffer["availability"] = "IN_STOCK") {
  return { id, deliveredTotalPence, availability, variant: { id: `${strengthMg}x${packQuantity}`, ingredient: "SILDENAFIL", brandName: null, strengthMg, formulation: "Tablet", packQuantity } } as PublicOffer;
}

test("alerts watch the lowest in-stock delivered total; out-of-stock prices never count", () => {
  const offers = [offer("a", 50, 8, 1190), offer("b", 50, 8, 990, "OUT_OF_STOCK"), offer("c", 50, 8, 1290), offer("d", 100, 4, 1500)];
  assert.equal(lowestTotalPence(offers, 50, 8), 1190);
  assert.equal(lowestTotalPence(offers, 25, 8), null);
  assert.deepEqual(priceAlertOptions(offers), [{ strengthMg: 50, packQuantity: 8, lowestPence: 1190 }, { strengthMg: 100, packQuantity: 4, lowestPence: 1500 }]);
});

test("targets parse only in the strength x pack form", () => {
  assert.deepEqual(parseAlertTarget("50x8"), { strengthMg: 50, packQuantity: 8 });
  assert.equal(parseAlertTarget("50x8;drop"), null);
  assert.equal(parseAlertTarget("x8"), null);
});

test("notify once on reaching the target, again only lower and at most daily, re-arm above it", () => {
  const fresh = { thresholdPence: 1000, lastNotifiedAt: null, lastNotifiedPence: null };
  assert.equal(alertDecision(fresh, 1100, now), "none");
  assert.equal(alertDecision(fresh, 1000, now), "notify");
  assert.equal(alertDecision(fresh, null, now), "none");
  const notified = { thresholdPence: 1000, lastNotifiedAt: new Date(now.getTime() - 2 * HOUR), lastNotifiedPence: 950 };
  assert.equal(alertDecision(notified, 950, now), "none");
  assert.equal(alertDecision(notified, 900, now), "none", "lower, but within a day of the last email");
  assert.equal(alertDecision({ ...notified, lastNotifiedAt: new Date(now.getTime() - 25 * HOUR) }, 900, now), "notify");
  assert.equal(alertDecision(notified, 1200, now), "reset");
});

test("emails escape what goes into HTML and carry the manage link", () => {
  const confirm = confirmationEmail({ target: "Generic <b>sildenafil</b> 50mg × 8", thresholdPence: 1000, manageUrl: "https://example.co.uk/ed/alerts/abc" });
  assert.match(confirm.html, /&lt;b&gt;sildenafil/);
  assert.match(confirm.text, /https:\/\/example\.co\.uk\/ed\/alerts\/abc/);
  const drop = priceDropEmail({ target: "Cialis 10mg × 4", thresholdPence: 3000, lowestPence: 2899, compareUrl: "https://example.co.uk/c", manageUrl: "https://example.co.uk/m" });
  assert.match(drop.subject, /£28\.99/);
});
