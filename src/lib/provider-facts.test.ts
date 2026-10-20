import assert from "node:assert/strict";
import { test } from "node:test";

import { checkedAtUpdates, factsFromForm, formFromFacts } from "./provider-facts";

const now = new Date("2026-10-20T12:00:00Z");
const blank = factsFromForm({ trustpilotUrl: "", trustpilotScore: "", trustpilotReviewCount: "", inspectionOutcome: "", inspectionDate: "", nextDayDelivery: "unknown", discreetPackaging: "unknown", paymentMethods: [], recheckedToday: false });

test("form strings become stored facts and back", () => {
  const values = { trustpilotUrl: "https://uk.trustpilot.com/review/example.co.uk", trustpilotScore: "4.8", trustpilotReviewCount: "1234", inspectionOutcome: "STANDARDS_MET" as const, inspectionDate: "2025-03-31", nextDayDelivery: "yes" as const, discreetPackaging: "no" as const, paymentMethods: ["PAYPAL" as const, "PAYPAL" as const], recheckedToday: false };
  const facts = factsFromForm(values);
  assert.equal(facts.trustpilotScoreTenths, 48);
  assert.equal(facts.nextDayDelivery, true);
  assert.equal(facts.discreetPackaging, false);
  assert.deepEqual(facts.paymentMethods, ["PAYPAL"]);
  assert.deepEqual(formFromFacts(facts), { ...values, paymentMethods: ["PAYPAL"] });
  assert.equal(blank.nextDayDelivery, null, "unknown is stored as not recorded, never as no");
});

test("only groups that changed get a new checked date, unless staff re-checked everything", () => {
  const next = { ...blank, nextDayDelivery: true };
  assert.deepEqual(checkedAtUpdates(blank, next, false, now), { serviceFactsCheckedAt: now });
  assert.deepEqual(checkedAtUpdates(next, next, false, now), {});
  assert.deepEqual(checkedAtUpdates(next, next, true, now), { serviceFactsCheckedAt: now }, "re-checked, but only groups with something recorded");
  assert.deepEqual(checkedAtUpdates(next, blank, false, now), { serviceFactsCheckedAt: null }, "clearing a group clears its date");
});
