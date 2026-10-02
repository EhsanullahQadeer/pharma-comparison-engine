import assert from "node:assert/strict";
import test from "node:test";

import { decisionJsonInPage } from "./chatgpt-response";

test("extracts a completed ChatGPT decision with decorative link arrows", () => {
  const visibleReply = `Worked for 43s\n{"gphcNumber":"9011329","status":"NEEDS_REVIEW","officialProductUrl":"https://www.skinandme.com/ ↗","reason":"See https://www.hairandme.com/products/the-capsules ↗ for details","classification":{"version":2}}`;
  const extracted = decisionJsonInPage(visibleReply, "9011329");
  assert.ok(extracted);
  const decision = JSON.parse(extracted) as { officialProductUrl: string; reason: string };
  assert.equal(decision.officialProductUrl, "https://www.skinandme.com/");
  assert.match(decision.reason, /the-capsules for details/);
});

test("does not capture another pharmacy's response", () => {
  assert.equal(decisionJsonInPage('{"gphcNumber":"9011329","status":"REJECTED"}', "1234567"), "");
});

test("repairs browser-inserted line breaks inside JSON strings", () => {
  const visibleReply = '{"gphcNumber":"9011329","status":"NEEDS_REVIEW","reason":"A product page\n identifies the pharmacy"}';
  const extracted = decisionJsonInPage(visibleReply, "9011329");
  assert.equal((JSON.parse(extracted) as { reason: string }).reason, "A product page  identifies the pharmacy");
});

test("returns malformed but complete matching JSON for a prompt parse error", () => {
  const visibleReply = '{"gphcNumber":"9011329","status":"NEEDS_REVIEW","reason": invalid}';
  assert.equal(decisionJsonInPage(visibleReply, "9011329"), visibleReply);
});
