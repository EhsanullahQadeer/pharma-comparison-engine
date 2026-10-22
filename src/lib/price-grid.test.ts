import assert from "node:assert/strict";
import { test } from "node:test";

import type { PriceGrid, PublicOffer } from "@/types/comparison";

import { buildPriceGrid, defaultPack, filterGridOffers, gridOffers } from "./price-grid";

const now = new Date("2026-10-19T12:00:00Z");
const HOUR = 60 * 60 * 1000;

type OfferSpec = { id: string; provider: string; strength?: number; pack?: number; total: number; item?: number; verified?: boolean; outOfStock?: boolean; hoursAgo?: number };

function offer({ id, provider, strength = 50, pack = 8, total, item = total, verified = false, outOfStock = false, hoursAgo = 1 }: OfferSpec): PublicOffer {
  const checkedAt = new Date(now.getTime() - hoursAgo * HOUR);
  return {
    id,
    providerId: provider,
    providerName: `Pharmacy ${provider}`,
    providerSlug: provider,
    providerDomain: `${provider}.co.uk`,
    providerLogoUrl: null,
    providerRegulatorType: "GPHC",
    providerRegulatorReference: "9010001",
    providerDispensingPartnerName: null,
    providerFacts: { serviceRegions: [], nextDayDelivery: null, discreetPackaging: null, paymentMethods: [], inspectionOutcome: null, inspectionDate: null, trustpilotUrl: null, trustpilotScoreTenths: null, trustpilotReviewCount: null },
    variant: { id: `v-${strength}-${pack}`, ingredient: "SILDENAFIL", brandName: null, strengthMg: strength, formulation: "Film-coated tablet (generic)", packQuantity: pack },
    itemPricePence: item,
    wasPricePence: null,
    deliveryFeePence: total - item,
    consultationFeePence: 0,
    otherMandatoryFeesPence: 0,
    deliveredTotalPence: total,
    perTabletPence: Math.round(total / pack),
    feesVerified: verified,
    availability: outOfStock ? "OUT_OF_STOCK" : "IN_STOCK",
    purchaseModel: "ONE_OFF",
    billingPeriodDays: null,
    sourceUrl: `https://${provider}.co.uk/p`,
    checkedAt,
    freshness: hoursAgo <= 24 ? "fresh" : "stale",
    discounts: [],
    discountedTotalPence: null,
    codeDiscountId: null,
    priceChangePence: null,
    thirtyDayLow: false,
  };
}

const total = { mode: "total", fees: true } as const;

function priceAt(grid: PriceGrid, provider: string, column: number) {
  const cell = grid.rows.find((row) => row.providerId === provider)?.cells[grid.columns.indexOf(column)];
  return cell?.kind === "price" ? cell.valuePence : cell?.kind;
}

const sample = [
  offer({ id: "a25", provider: "a", strength: 25, total: 759 }),
  offer({ id: "a50", provider: "a", strength: 50, total: 959 }),
  offer({ id: "b50", provider: "b", strength: 50, total: 1374 }),
  offer({ id: "b100", provider: "b", strength: 100, total: 1414 }),
  offer({ id: "c25", provider: "c", strength: 25, total: 1098 }),
  offer({ id: "c50", provider: "c", strength: 50, total: 1598 }),
  offer({ id: "c100", provider: "c", strength: 100, total: 900, outOfStock: true }),
  offer({ id: "d50-4", provider: "d", strength: 50, pack: 4, total: 600 }),
];

test("columns are strengths, one row per pharmacy, for the most-listed pack", () => {
  const grid = buildPriceGrid(sample, total, now);
  assert.equal(grid.axis, "strength");
  assert.equal(grid.pack, 8);
  assert.deepEqual(grid.packs, [4, 8]);
  assert.deepEqual(grid.columns, [25, 50, 100]);
  assert.deepEqual(grid.rows.map((row) => row.providerId), ["a", "b", "c"]);
  assert.equal(priceAt(grid, "b", 25), "not-sold");
  assert.equal(priceAt(grid, "c", 100), "out-of-stock");
});

test("default pack is the one most pharmacies list, ties going to the smaller pack", () => {
  assert.equal(defaultPack(sample), 8);
  assert.equal(defaultPack([offer({ id: "x", provider: "x", pack: 12, total: 1 }), offer({ id: "y", provider: "y", pack: 4, total: 1 })]), 4);
  assert.equal(buildPriceGrid(sample, { ...total, pack: 99 }, now).pack, 8);
});

test("default sort column is the one with the most prices; rows without a price there go last", () => {
  const grid = buildPriceGrid(sample, total, now);
  assert.equal(grid.sortColumn, 50);
  const by100 = buildPriceGrid(sample, { ...total, column: 100 }, now);
  // Only b has an in-stock 100mg price; c's is out of stock, so it drops with a.
  assert.deepEqual(by100.rows.map((row) => row.providerId), ["b", "a", "c"]);
});

test("verified fees rank first, then price, then a neutral id tie-break", () => {
  const offers = [
    offer({ id: "1", provider: "cheap", total: 500 }),
    offer({ id: "2", provider: "verified", total: 900, verified: true }),
    offer({ id: "3", provider: "tie-b", total: 700 }),
    offer({ id: "4", provider: "tie-a", total: 700 }),
  ];
  assert.deepEqual(buildPriceGrid(offers, total, now).rows.map((row) => row.providerId), ["verified", "cheap", "tie-a", "tie-b"]);
});

test("the cheapest in-stock cell in every column is marked lowest, ties included", () => {
  const offers = [...sample, offer({ id: "e25", provider: "e", strength: 25, total: 759 })];
  const grid = buildPriceGrid(offers, total, now);
  const lowest = grid.rows.flatMap((row) => row.cells.map((cell, index) => (cell.kind === "price" && cell.lowest ? `${row.providerId}@${grid.columns[index]}` : null))).filter(Boolean);
  // 100mg has a single in-stock price, so nothing competes there and nothing is labelled.
  assert.deepEqual(lowest.sort(), ["a@25", "a@50", "e@25"]);
});

test("summary figures always equal the grid's own cells", () => {
  const grid = buildPriceGrid(sample, total, now);
  grid.columns.forEach((column, index) => {
    const values = grid.rows.flatMap((row) => {
      const cell = row.cells[index];
      return cell.kind === "price" ? [cell.valuePence] : [];
    });
    const summary = grid.summaries[index];
    assert.equal(summary.pharmacyCount, values.length);
    assert.equal(summary.lowestPence, values.length > 0 ? Math.min(...values) : null);
    assert.equal(summary.highestPence, values.length > 0 ? Math.max(...values) : null);
  });
  // Median, not mean: 959, 1374, 1598 → 1374.
  assert.equal(grid.summaries[1].medianPence, 1374);
  // Out-of-stock prices never count, even when cheaper.
  assert.equal(grid.summaries[2].lowestPence, 1414);
});

test("latest check is the newest price on screen", () => {
  const offers = [offer({ id: "1", provider: "a", total: 500, hoursAgo: 30 }), offer({ id: "2", provider: "b", total: 600, hoursAgo: 2 }), offer({ id: "3", provider: "c", strength: 25, pack: 4, total: 1, hoursAgo: 0 })];
  const grid = buildPriceGrid(offers, total, now);
  // c's pack of 4 is not in view, so its newer check does not count.
  assert.equal(grid.latestCheckedAt?.getTime(), now.getTime() - 2 * HOUR);
  assert.equal(grid.rows.find((row) => row.providerId === "a")?.freshness, "stale");
});

test("a single-strength product compares pack sizes instead", () => {
  const offers = [offer({ id: "1", provider: "a", pack: 4, total: 1999 }), offer({ id: "2", provider: "a", pack: 8, total: 3499 }), offer({ id: "3", provider: "b", pack: 8, total: 3299 })];
  const grid = buildPriceGrid(offers, total, now);
  assert.equal(grid.axis, "pack");
  assert.equal(grid.pack, null);
  assert.deepEqual(grid.columns, [4, 8]);
  assert.deepEqual(grid.packs, []);
  assert.equal(priceAt(grid, "b", 4), "not-sold");
});

test("per-tablet 'any pack' takes each pharmacy's lowest per-tablet price for the strength", () => {
  const offers = [offer({ id: "small", provider: "a", pack: 4, total: 800 }), offer({ id: "big", provider: "a", pack: 16, total: 2400 }), offer({ id: "b", provider: "b", pack: 8, total: 1000 }), offer({ id: "c", provider: "c", strength: 25, pack: 8, total: 900 })];
  const grid = buildPriceGrid(offers, { mode: "tablet", fees: true, pack: "any" }, now);
  assert.equal(grid.pack, "any");
  const cell = grid.rows.find((row) => row.providerId === "a")?.cells[grid.columns.indexOf(50)];
  assert.ok(cell?.kind === "price" && cell.offer.id === "big" && cell.valuePence === 150);
  // "Any pack" only exists per tablet; a pack total needs one pack size.
  assert.equal(buildPriceGrid(offers, { ...total, pack: "any" }, now).pack, 8);
});

test("medicine-only prices leave out delivery and fees", () => {
  const grid = buildPriceGrid([offer({ id: "1", provider: "a", total: 1290, item: 1000 }), offer({ id: "2", provider: "b", total: 1100 })], { mode: "total", fees: false }, now);
  assert.deepEqual(grid.rows.map((row) => [row.providerId, row.cells[0].kind === "price" && row.cells[0].valuePence]), [["a", 1000], ["b", 1100]]);
});

test("search keeps only matching pharmacies, and the summaries follow", () => {
  const grid = buildPriceGrid(sample, { ...total, query: " pharmacy C " }, now);
  assert.deepEqual(grid.rows.map((row) => row.providerId), ["c"]);
  assert.equal(grid.summaries[1].lowestPence, 1598);
  assert.deepEqual(gridOffers(grid.rows).map((o) => o.id).sort(), ["c100", "c25", "c50"]);
});

test("an in-stock offer wins a cell over an out-of-stock one from the same pharmacy", () => {
  const grid = buildPriceGrid([offer({ id: "oos", provider: "a", total: 100, outOfStock: true }), offer({ id: "in", provider: "a", total: 900 })], total, now);
  const cell = grid.rows[0].cells[0];
  assert.ok(cell.kind === "price" && cell.offer.id === "in");
});

test("'With code' prices and ranks by the code price; standard mode ignores codes", () => {
  const coded = { ...offer({ id: "coded", provider: "a", total: 1000 }), discountedTotalPence: 800 };
  const plain = offer({ id: "plain", provider: "b", total: 900 });
  assert.deepEqual(buildPriceGrid([coded, plain], total, now).rows.map((row) => row.providerId), ["b", "a"]);
  const withCodes = buildPriceGrid([coded, plain], { ...total, codes: true }, now);
  assert.deepEqual(withCodes.rows.map((row) => row.providerId), ["a", "b"]);
  assert.equal(withCodes.summaries[0].lowestPence, 800);
});

test("drawer filters drop offers that fail them; free delivery needs checked fees; one-off unless subscriptions are chosen", () => {
  const offers = [
    offer({ id: "oos", provider: "a", total: 500, outOfStock: true }),
    offer({ id: "unchecked-free", provider: "b", total: 600 }),
    offer({ id: "checked-free", provider: "c", total: 700, verified: true }),
    { ...offer({ id: "subscription", provider: "d", total: 800 }), purchaseModel: "RECURRING" as const },
  ];
  const ids = (list: PublicOffer[]) => list.map((entry) => entry.id);
  assert.deepEqual(ids(filterGridOffers(offers, { inStock: true })), ["unchecked-free", "checked-free"]);
  assert.deepEqual(ids(filterGridOffers(offers, { freeDelivery: true })), ["checked-free"]);
  assert.deepEqual(ids(filterGridOffers(offers, { purchaseModel: "RECURRING" })), ["subscription"]);
  assert.deepEqual(ids(filterGridOffers(offers, {})), ["oos", "unchecked-free", "checked-free"]);
});

test("a row lists the discount 'With code' applies first", () => {
  const discount = (id: string) => ({ id, eligibility: "New customers", code: id, valueType: "PERCENT" as const, valuePence: null, valuePercent: 10, stackable: false, expiresAt: null });
  const coded = { ...offer({ id: "1", provider: "a", total: 1000 }), discounts: [discount("FIRST"), discount("BEST")], discountedTotalPence: 900, codeDiscountId: "BEST" };
  assert.deepEqual(buildPriceGrid([coded], total, now).rows[0].discounts.map((entry) => entry.id), ["BEST", "FIRST"]);
});

test("pharmacy-fact filters pass only recorded facts", () => {
  const facts = (overrides: Partial<PublicOffer["providerFacts"]>) => ({ serviceRegions: [], nextDayDelivery: null, discreetPackaging: null, paymentMethods: [], inspectionOutcome: null, inspectionDate: null, trustpilotUrl: null, trustpilotScoreTenths: null, trustpilotReviewCount: null, ...overrides });
  const offers = [
    { ...offer({ id: "a", provider: "a", total: 500 }), providerFacts: facts({ nextDayDelivery: true, serviceRegions: ["England", "Wales"], paymentMethods: ["PAYPAL" as const], inspectionOutcome: "STANDARDS_MET" as const, trustpilotScoreTenths: 46 }) },
    { ...offer({ id: "b", provider: "b", total: 600 }), providerFacts: facts({ nextDayDelivery: false, inspectionOutcome: "STANDARDS_NOT_ALL_MET" as const, trustpilotScoreTenths: 39 }) },
    offer({ id: "c", provider: "c", total: 700 }),
  ];
  const ids = (list: PublicOffer[]) => list.map((entry) => entry.id);
  assert.deepEqual(ids(filterGridOffers(offers, { nextDay: true })), ["a"]);
  assert.deepEqual(ids(filterGridOffers(offers, { inspectionPassed: true })), ["a"]);
  assert.deepEqual(ids(filterGridOffers(offers, { region: "wales" })), ["a"]);
  assert.deepEqual(ids(filterGridOffers(offers, { payment: "PAYPAL" })), ["a"]);
  assert.deepEqual(ids(filterGridOffers(offers, { minTrustpilot: 40 })), ["a"]);
});
