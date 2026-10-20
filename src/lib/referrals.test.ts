import assert from "node:assert/strict";
import { test } from "node:test";

import { clientIp, isAllowedDestination, isLikelyBotRequest, outboundHref, parseOutboundParams, visitorHash } from "./referrals";

const browserUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

test("outbound links carry only a page code and rank, and round-trip", () => {
  const href = outboundHref("offer_1", "COMPARE", 3);
  assert.equal(href, "/go/offer_1?p=compare&r=3");
  assert.deepEqual(parseOutboundParams(new URL(href, "https://x.test").searchParams), { placement: "COMPARE", rankPosition: 3, gridLayout: null });
  assert.equal(outboundHref("offer_1", "COMPARE", 2, "swipe"), "/go/offer_1?p=compare&r=2&l=swipe");
  assert.equal(parseOutboundParams(new URLSearchParams("p=compare&l=swipe")).gridLayout, "SWIPE");
  assert.equal(parseOutboundParams(new URLSearchParams("p=compare&l=desktop")).gridLayout, null);
  assert.equal(outboundHref("offer_1", "PHARMACY_PROFILE"), "/go/offer_1?p=pharmacy");
});

test("unknown placements and junk ranks are dropped", () => {
  assert.deepEqual(parseOutboundParams(new URLSearchParams("p=sildenafil-100mg&r=-1")), { placement: null, rankPosition: null, gridLayout: null });
  assert.deepEqual(parseOutboundParams(new URLSearchParams("p=prices&r=2.5")), { placement: "INGREDIENT_PRICES", rankPosition: null, gridLayout: null });
  assert.deepEqual(parseOutboundParams(new URLSearchParams("r=9999")), { placement: null, rankPosition: null, gridLayout: null });
});

test("destinations must be https on the provider's own domain", () => {
  assert.equal(isAllowedDestination("https://www.clickpharmacy.co.uk/viagra", "clickpharmacy.co.uk"), true);
  assert.equal(isAllowedDestination("https://clickpharmacy.co.uk/viagra", "www.clickpharmacy.co.uk"), true);
  assert.equal(isAllowedDestination("https://shop.clickpharmacy.co.uk/x", "clickpharmacy.co.uk"), true);
  assert.equal(isAllowedDestination("http://clickpharmacy.co.uk/viagra", "clickpharmacy.co.uk"), false);
  assert.equal(isAllowedDestination("https://evil.test/?clickpharmacy.co.uk", "clickpharmacy.co.uk"), false);
  assert.equal(isAllowedDestination("https://notclickpharmacy.co.uk/", "clickpharmacy.co.uk"), false);
  assert.equal(isAllowedDestination("https://clickpharmacy.co.uk.evil.test/", "clickpharmacy.co.uk"), false);
  assert.equal(isAllowedDestination("https://user:pass@clickpharmacy.co.uk/", "clickpharmacy.co.uk"), false);
  assert.equal(isAllowedDestination("javascript:alert(1)", "clickpharmacy.co.uk"), false);
  assert.equal(isAllowedDestination("not a url", "clickpharmacy.co.uk"), false);
});

test("bot heuristics flag crawlers, prefetches and missing user agents", () => {
  assert.equal(isLikelyBotRequest(new Headers({ "user-agent": browserUa })), false);
  assert.equal(isLikelyBotRequest(new Headers({ "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" })), true);
  assert.equal(isLikelyBotRequest(new Headers({ "user-agent": "curl/8.4.0" })), true);
  assert.equal(isLikelyBotRequest(new Headers()), true);
  assert.equal(isLikelyBotRequest(new Headers({ "user-agent": browserUa, "sec-purpose": "prefetch;prerender" })), true);
});

test("visitor hash is stable within a day, rotates daily and needs an IP and secret", () => {
  const day1 = new Date("2026-09-26T08:00:00Z");
  const later = new Date("2026-09-26T20:00:00Z");
  const day2 = new Date("2026-09-27T08:00:00Z");
  const hash = visitorHash("203.0.113.9", browserUa, "secret", day1);
  assert.match(hash ?? "", /^[0-9a-f]{32}$/);
  assert.equal(visitorHash("203.0.113.9", browserUa, "secret", later), hash);
  assert.notEqual(visitorHash("203.0.113.9", browserUa, "secret", day2), hash);
  assert.ok(!hash?.includes("203"));
  assert.equal(visitorHash(null, browserUa, "secret", day1), null);
  assert.equal(visitorHash("203.0.113.9", browserUa, undefined, day1), null);
});

test("client IP comes from the first forwarded hop", () => {
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })), "203.0.113.9");
  assert.equal(clientIp(new Headers({ "x-real-ip": "198.51.100.2" })), "198.51.100.2");
  assert.equal(clientIp(new Headers()), null);
});
