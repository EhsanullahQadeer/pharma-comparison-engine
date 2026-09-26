import assert from "node:assert/strict";
import { test } from "node:test";

import type { PublicOffer } from "@/types/comparison";

import {
  comparisonHref,
  deliveredTotalPence,
  displayName,
  freshnessTier,
  parseComparisonFilters,
  perTabletPence,
  providerSlug,
  splitRankedOffers,
} from "./comparison";


const HOUR = 60 * 60 * 1000;

function offer(overrides: Partial<PublicOffer> & Pick<PublicOffer, "id" | "providerId" | "deliveredTotalPence">): PublicOffer {
  return {
    providerName: overrides.providerId,
    providerSlug: overrides.providerId,
    providerDomain: `${overrides.providerId}.co.uk`,
    variant: { id: "v", ingredient: "SILDENAFIL", brandName: null, strengthMg: 50, formulation: "Film-coated tablet", packQuantity: 8 },
    itemPricePence: overrides.deliveredTotalPence,
    deliveryFeePence: 0,
    consultationFeePence: 0,
    otherMandatoryFeesPence: 0,
    perTabletPence: perTabletPence(overrides.deliveredTotalPence, 8),
    feesVerified: true,
    availability: "IN_STOCK",
    purchaseModel: "ONE_OFF",
    sourceUrl: "https://example.test",
    checkedAt: new Date(),
    freshness: "fresh",
    ...overrides,
  };
}

test("roadmap worked example: £16 + £3 delivery vs £18 inclusive, 8 tablets", () => {
  const withDelivery = deliveredTotalPence({ itemPricePence: 1600, deliveryFeePence: 300, consultationFeePence: 0, otherMandatoryFeesPence: 0 });
  const inclusive = deliveredTotalPence({ itemPricePence: 1800, deliveryFeePence: 0, consultationFeePence: 0, otherMandatoryFeesPence: 0 });
  assert.equal(withDelivery, 1900);
  assert.equal(perTabletPence(withDelivery, 8), 238);
  assert.equal(inclusive, 1800);
  assert.equal(perTabletPence(inclusive, 8), 225);
});

test("freshness tiers follow the 24h / 48h boundaries", () => {
  const now = new Date("2026-09-26T12:00:00Z");
  assert.equal(freshnessTier(new Date(now.getTime() - 23 * HOUR), now), "fresh");
  assert.equal(freshnessTier(new Date(now.getTime() - 24 * HOUR), now), "fresh");
  assert.equal(freshnessTier(new Date(now.getTime() - 30 * HOUR), now), "stale");
  assert.equal(freshnessTier(new Date(now.getTime() - 49 * HOUR), now), "expired");
});

test("ranking is cheapest first with a stable id tie-break, and gates stale / out-of-stock offers", () => {
  const offers = [
    offer({ id: "o3", providerId: "c", deliveredTotalPence: 1800 }),
    offer({ id: "o2", providerId: "b", deliveredTotalPence: 1800 }),
    offer({ id: "o1", providerId: "a", deliveredTotalPence: 1900 }),
    offer({ id: "o4", providerId: "d", deliveredTotalPence: 900, freshness: "stale" }),
    offer({ id: "o5", providerId: "e", deliveredTotalPence: 800, availability: "OUT_OF_STOCK" }),
  ];
  const { ranked, other } = splitRankedOffers(offers, "total");
  assert.deepEqual(ranked.map((entry) => entry.id), ["o2", "o3", "o1"]);
  assert.deepEqual(other.map((entry) => entry.id), ["o5", "o4"]);
});

test("an indicative total never outranks a verified one, even when cheaper", () => {
  const { ranked } = splitRankedOffers(
    [offer({ id: "cheap", providerId: "a", deliveredTotalPence: 1000, feesVerified: false }), offer({ id: "verified", providerId: "b", deliveredTotalPence: 2000 })],
    "total",
  );
  assert.deepEqual(ranked.map((entry) => entry.id), ["verified", "cheap"]);
});

test("filters round-trip through the URL and ignore junk", () => {
  const filters = parseComparisonFilters({ medicine: "tadalafil", strength: "20", pack: "4", sort: "total" });
  assert.deepEqual(filters, { ingredient: "TADALAFIL", strengthMg: 20, packQuantity: 4, sort: "total" });
  assert.equal(comparisonHref(filters), "/ed/compare?medicine=tadalafil&strength=20&pack=4&sort=total");
  assert.deepEqual(parseComparisonFilters({ medicine: "aspirin", strength: "-5", pack: "x" }), { ingredient: undefined, strengthMg: undefined, packQuantity: undefined, sort: "tablet" });
  assert.equal(comparisonHref({ sort: "tablet" }), "/ed/compare");
});

test("slugs and display names", () => {
  assert.equal(providerSlug("www.Click-Pharmacy.co.uk"), "click-pharmacy-co-uk");
  assert.equal(displayName("PEAK PHARMACY DIRECT"), "Peak Pharmacy Direct");
  assert.equal(displayName("RAI'S PHARMACY"), "Rai's Pharmacy");
  assert.equal(displayName("medy"), "medy");
});
