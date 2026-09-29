import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { ComparisonFilters, PublicOffer } from "@/types/comparison";

import {
  comparisonHref,
  deliveredTotalPence,
  displayName,
  filterOffers,
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
    providerLogoUrl: null,
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
    discounts: [],
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

test("ranking is cheapest first with a stable id tie-break, ranks stale offers by price and gates out-of-stock ones", () => {
  const offers = [
    offer({ id: "o3", providerId: "c", deliveredTotalPence: 1800 }),
    offer({ id: "o2", providerId: "b", deliveredTotalPence: 1800 }),
    offer({ id: "o1", providerId: "a", deliveredTotalPence: 1900 }),
    offer({ id: "o4", providerId: "d", deliveredTotalPence: 900, freshness: "stale" }),
    offer({ id: "o5", providerId: "e", deliveredTotalPence: 800, availability: "OUT_OF_STOCK" }),
  ];
  const { ranked, other } = splitRankedOffers(offers, "total");
  assert.deepEqual(ranked.map((entry) => entry.id), ["o4", "o2", "o3", "o1"]);
  assert.deepEqual(other.map((entry) => entry.id), ["o5"]);
});

test("an indicative total never outranks a verified one, even when cheaper", () => {
  const { ranked } = splitRankedOffers(
    [offer({ id: "cheap", providerId: "a", deliveredTotalPence: 1000, feesVerified: false }), offer({ id: "verified", providerId: "b", deliveredTotalPence: 2000 })],
    "total",
  );
  assert.deepEqual(ranked.map((entry) => entry.id), ["verified", "cheap"]);
});

test("filters round-trip through the URL and ignore junk", () => {
  const filters = parseComparisonFilters({ medicine: "tadalafil", type: "cialis", strength: "20", form: "film-coated-tablet", pack: "4", plan: "subscription", sort: "total" });
  assert.deepEqual(filters, { ingredient: "TADALAFIL", productType: "cialis", strengthMg: 20, formulation: "film-coated-tablet", packQuantity: 4, purchaseModel: "RECURRING", sort: "total" });
  assert.equal(comparisonHref(filters), "/ed/compare?medicine=tadalafil&type=cialis&strength=20&form=film-coated-tablet&pack=4&plan=subscription&sort=total");
  assert.deepEqual(parseComparisonFilters({ medicine: "aspirin", type: "<script>", strength: "-5", form: "Film Coated", pack: "x", plan: "RECURRING" }), {
    ingredient: undefined, productType: undefined, strengthMg: undefined, formulation: undefined, packQuantity: undefined, purchaseModel: undefined, sort: "tablet",
  });
  assert.equal(comparisonHref({ sort: "tablet" }), "/ed/compare");
});

test("brand/generic, form and purchase-model filters use the real catalogue wording", () => {
  const variant = (id: string, brandName: string, formulation: string) => ({ id, ingredient: "SILDENAFIL" as const, brandName, strengthMg: 50, formulation, packQuantity: 4 });
  const offers = [
    offer({ id: "viagra", providerId: "a", deliveredTotalPence: 2400, variant: variant("v1", "Viagra", "Film-coated tablet") }),
    offer({ id: "generic", providerId: "b", deliveredTotalPence: 800, variant: variant("v2", "Viagra", "Film-coated tablet (generic)") }),
    offer({ id: "melt", providerId: "c", deliveredTotalPence: 2000, variant: variant("v3", "Viagra", "Orodispersible tablet") }),
    offer({ id: "connect", providerId: "d", deliveredTotalPence: 2200, variant: variant("v4", "Viagra Connect", "Film-coated tablet"), purchaseModel: "RECURRING" }),
  ];
  const ids = (filters: Partial<ComparisonFilters>) => filterOffers(offers, { sort: "tablet", ...filters }).map((entry) => entry.id);
  assert.deepEqual(ids({ productType: "generic" }), ["generic"]);
  assert.deepEqual(ids({ productType: "viagra" }), ["viagra", "melt"]);
  assert.deepEqual(ids({ productType: "viagra-connect" }), ["connect"]);
  // "(generic)" is a qualifier, not a different form of tablet.
  assert.deepEqual(ids({ formulation: "film-coated-tablet" }), ["viagra", "generic", "connect"]);
  assert.deepEqual(ids({ formulation: "orodispersible-tablet" }), ["melt"]);
  assert.deepEqual(ids({ purchaseModel: "RECURRING" }), ["connect"]);
  assert.deepEqual(ids({ productType: "unknown-brand" }), []);
});

test("slugs and display names", () => {
  assert.equal(providerSlug("www.Click-Pharmacy.co.uk"), "click-pharmacy-co-uk");
  assert.equal(displayName("PEAK PHARMACY DIRECT"), "Peak Pharmacy Direct");
  assert.equal(displayName("RAI'S PHARMACY"), "Rai's Pharmacy");
  assert.equal(displayName("medy"), "medy");
});

// M7 independence rule: commercial relationships never change inclusion or order. Ranking code
// must not read affiliate/commission/referral data at all, and results are identical whichever
// providers are partners.
test("ranking is identical for partner and non-partner providers", () => {
  const base = [
    offer({ id: "o1", providerId: "a", deliveredTotalPence: 2100 }),
    offer({ id: "o2", providerId: "b", deliveredTotalPence: 1900 }),
    offer({ id: "o3", providerId: "c", deliveredTotalPence: 1900, feesVerified: false }),
    offer({ id: "o4", providerId: "d", deliveredTotalPence: 2500 }),
  ];
  const expected = splitRankedOffers(base, "total").ranked.map((entry) => entry.id);
  for (const partners of [["a"], ["d"], ["a", "c", "d"]]) {
    const tagged = base.map((entry) => ({ ...entry, affiliateApproved: partners.includes(entry.providerId), commissionPence: partners.includes(entry.providerId) ? 800 : 0 }));
    assert.deepEqual(splitRankedOffers(tagged, "total").ranked.map((entry) => entry.id), expected);
  }
});

test("ranking and public offer reads never reference affiliate data", () => {
  for (const file of ["comparison.ts", "../actions/offers/public-offers.ts", "../types/comparison.ts"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /affiliate|commission|referral/i, file);
  }
});
