import assert from "node:assert/strict";
import { test } from "node:test";

import { comparedOffers, parseComparisonFilters, splitRankedOffers, subscriptionTerms } from "@/lib/comparison";
import { bestDiscount } from "@/lib/discounts";
import { lowestTotalPence } from "@/lib/price-alerts";
import { classifyJobFailure } from "@/lib/price-collection/job-retry";
import { impossiblePriceReason } from "@/lib/price-collection/price-sanity";
import { pickPageVariantPrice } from "@/lib/price-collection/scrape-price";
import { buildPriceGrid, filterGridOffers } from "@/lib/price-grid";
import { publicOffer } from "@/lib/public-offer-fixture";
import type { GridFilterFlags, PublicDiscount, PublicOffer } from "@/types/comparison";

// Roadmap §4.7 (docs/monj-functionality-and-ed-milestones.md): one test per failure scenario the
// pricing and collection code itself is responsible for. Rows that are business or operating
// decisions rather than code have no test here: affiliate refusals, partners leaving, monetisation,
// duplicate/refunded conversions, out-of-hours reports, revenue concentration and search traffic
// (milestones 07/08 and the runbook); misleading claimed listings (staff review + audit log); a
// missing registration or changed domain owner (only PUBLISHED pharmacies are ever queried, and
// status changes are staff-only — enforced in the database queries, not pure code).

const now = new Date("2026-10-22T12:00:00Z");
const noFlags: Required<GridFilterFlags> = { inStock: false, freeDelivery: false, noConsultation: false, verifiedOnly: false, hasDiscount: false, nextDay: false, discreet: false, inspectionPassed: false };
const anyChoice = { purchaseModel: undefined, region: undefined, payment: undefined, minTrustpilot: undefined };

function rankedIds(offers: PublicOffer[]) {
  const grid = buildPriceGrid(offers, { mode: "total", fees: true }, now);
  return grid.rows.map((row) => row.providerId);
}

test("§4.7 cheapest pharmacy pays no commission: ranking reads only price, fee status and ids", () => {
  // Partner status isn't an input at all; the order must not depend on how offers arrive either.
  const offers = [
    publicOffer({ id: "a", providerId: "partner", itemPricePence: 2500 }),
    publicOffer({ id: "b", providerId: "non-partner", itemPricePence: 1900 }),
    publicOffer({ id: "c", providerId: "tie-1", itemPricePence: 2100 }),
    publicOffer({ id: "d", providerId: "tie-2", itemPricePence: 2100 }),
  ];
  const expected = ["non-partner", "tie-1", "tie-2", "partner"];
  assert.deepEqual(rankedIds(offers), expected);
  assert.deepEqual(rankedIds([...offers].reverse()), expected);
});

test("§4.7 feed or page prices disagree: no price is taken, never the lower one", () => {
  const product = (price: string) => ({ "@type": "Product", name: "Sildenafil 50mg 4 Tablets", offers: { "@type": "Offer", price, priceCurrency: "GBP" } });
  const html = `<script type="application/ld+json">${JSON.stringify([product("9.99"), product("14.99")])}</script>`;
  assert.equal(pickPageVariantPrice(html, ["sildenafil"], { strengthMg: 50, packQuantity: 4 }, "https://example.test/p"), undefined);
  const agreeing = `<script type="application/ld+json">${JSON.stringify([product("14.99"), product("14.99")])}</script>`;
  assert.equal(pickPageVariantPrice(agreeing, ["sildenafil"], { strengthMg: 50, packQuantity: 4 }, "https://example.test/p")?.itemPricePence, 1499);
});

test("§4.7 a larger pack is cheaper per tablet: pack totals are only ranked within one pack size", () => {
  const variant = (strengthMg: number, packQuantity: number) => ({ id: `v-${strengthMg}-${packQuantity}`, ingredient: "SILDENAFIL" as const, brandName: null, strengthMg, formulation: "Film-coated tablet (generic)", packQuantity });
  const offers = [
    publicOffer({ id: "small", providerId: "a", itemPricePence: 2000, variant: variant(50, 4) }),
    publicOffer({ id: "big", providerId: "b", itemPricePence: 6000, variant: variant(50, 16) }),
    publicOffer({ id: "other-small", providerId: "c", itemPricePence: 2400, variant: variant(50, 4) }),
    publicOffer({ id: "stronger", providerId: "c", itemPricePence: 3000, variant: variant(100, 4) }),
  ];
  // "Any pack" only exists for per-tablet ranking; asked for with pack totals, the grid falls back to one pack.
  const totals = buildPriceGrid(offers, { mode: "total", fees: true, pack: "any" }, now);
  assert.equal(totals.pack, 4);
  assert.deepEqual(totals.rows.filter((row) => row.cells.some((cell) => cell.kind === "price")).map((row) => row.providerId), ["a", "c"]);
  // Per tablet across packs, each cell still carries its own offer, so its pack size and total show.
  const perTablet = buildPriceGrid(offers, { mode: "tablet", fees: true, pack: "any" }, now);
  const first = perTablet.rows[0].cells[0];
  assert.equal(first.kind === "price" && first.offer.variant.packQuantity, 16);
  assert.equal(first.kind === "price" && first.offer.deliveredTotalPence, 6000);
  // A single-strength product puts each pack size in its own column instead, so totals of different packs never meet.
  const packColumns = buildPriceGrid(offers.filter((offer) => offer.variant.strengthMg === 50), { mode: "total", fees: true }, now);
  assert.equal(packColumns.axis, "pack");
  assert.deepEqual(packColumns.columns, [4, 16]);
});

test("§4.7 a parser suddenly returns zero, blanks or nonsense: the scrape is refused and the old price kept", () => {
  assert.match(impossiblePriceReason({ itemPricePence: 0, packQuantity: 4, previousItemPricePence: 2000 }) ?? "", /previous price was kept/);
  assert.match(impossiblePriceReason({ itemPricePence: Number.NaN, packQuantity: 4, previousItemPricePence: 2000 }) ?? "", /previous price was kept/);
  assert.match(impossiblePriceReason({ itemPricePence: 20, packQuantity: 4, previousItemPricePence: 2000 }) ?? "", /previous price was kept/);
  assert.equal(impossiblePriceReason({ itemPricePence: 1800, packQuantity: 4, previousItemPricePence: 2000 }), null);
});

test("§4.7 a site blocks collection: verification goes to a person, robots refusals stop, neither is retried", () => {
  assert.equal(classifyJobFailure("Rendered page requires manual verification.", 1), "HUMAN_VERIFICATION_REQUIRED");
  assert.equal(classifyJobFailure("Collection stopped: robots rules (read in the browser) do not permit this page.", 1), "FAILED");
  assert.equal(classifyJobFailure("HTTP 403 Forbidden", 1), "FAILED");
});

test("§4.7 stock unknown or sold out: separate states, and a shown price never means in stock", () => {
  const noAvailability = `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Sildenafil 50mg 4 Tablets", offers: { "@type": "Offer", price: "14.99", priceCurrency: "GBP" } })}</script>`;
  assert.equal(pickPageVariantPrice(noAvailability, ["sildenafil"], { strengthMg: 50, packQuantity: 4 }, "https://example.test/p")?.availability, "UNKNOWN");

  const offers = [
    publicOffer({ id: "sold-out", providerId: "a", itemPricePence: 1000, availability: "OUT_OF_STOCK" }),
    publicOffer({ id: "unknown", providerId: "b", itemPricePence: 1500, availability: "UNKNOWN" }),
    publicOffer({ id: "in-stock", providerId: "c", itemPricePence: 1800 }),
  ];
  const { ranked, other } = splitRankedOffers(offers, "total");
  assert.deepEqual(ranked.map((offer) => offer.id), ["unknown", "in-stock"]);
  assert.deepEqual(other.map((offer) => offer.id), ["sold-out"]);
  assert.equal(ranked[0].availability, "UNKNOWN", "an unknown state is kept as unknown, not turned into in stock");
  const grid = buildPriceGrid(offers, { mode: "total", fees: true }, now);
  assert.deepEqual(grid.rows.map((row) => row.cells[0].kind), ["price", "price", "out-of-stock"]);
});

test("§4.7 discounts: never stacked, never more than the medicine, and only counted when asked for", () => {
  const discount = (id: string, valueType: PublicDiscount["valueType"], value: number): PublicDiscount => ({ id, eligibility: "New customers", code: id.toUpperCase(), valueType, valuePence: valueType === "FIXED_AMOUNT" ? value : null, valuePercent: valueType === "PERCENT" ? value : null, stackable: true, expiresAt: null });
  const best = bestDiscount([discount("ten", "PERCENT", 10), discount("fiver", "FIXED_AMOUNT", 500)], 2000);
  assert.equal(best?.discount.id, "fiver", "the single best code, even when both say they stack");
  assert.equal(best?.savingPence, 500);
  assert.equal(bestDiscount([discount("huge", "FIXED_AMOUNT", 5000)], 2000)?.savingPence, 2000, "never below zero");

  const withCode = publicOffer({ id: "coded", providerId: "a", itemPricePence: 2400, discountedTotalPence: 1900, codeDiscountId: "fiver" });
  const plain = publicOffer({ id: "plain", providerId: "b", itemPricePence: 2000 });
  assert.deepEqual(buildPriceGrid([withCode, plain], { mode: "total", fees: true }, now).rows.map((row) => row.providerId), ["b", "a"], "standard prices rank by default");
  assert.deepEqual(buildPriceGrid([withCode, plain], { mode: "total", fees: true, codes: true }, now).rows.map((row) => row.providerId), ["a", "b"]);
});

test("§4.7 delivery fees unknown or varying: indicative totals never outrank verified ones", () => {
  const unverifiedZero = publicOffer({ id: "indicative", providerId: "a", itemPricePence: 1500, feesVerified: false });
  const verified = publicOffer({ id: "verified", providerId: "b", itemPricePence: 1700, deliveryFeePence: 300 });
  assert.deepEqual(rankedIds([unverifiedZero, verified]), ["b", "a"]);
  // "Free delivery" needs a verified £0; an unverified £0 may just be a fee the page didn't show.
  assert.deepEqual(filterGridOffers([unverifiedZero, verified, publicOffer({ id: "free", providerId: "c" })], { ...noFlags, ...anyChoice, freeDelivery: true }).map((offer) => offer.id), ["free"]);
});

test("§4.7 a new-customer or subscription price never ranks against one-off prices", () => {
  const oneOff = publicOffer({ id: "one-off", providerId: "a", itemPricePence: 2400 });
  const subscription = publicOffer({ id: "plan", providerId: "b", itemPricePence: 1500, purchaseModel: "RECURRING" });
  const offers = [oneOff, subscription];
  // Default view (no plan chosen): one-off only — the cheaper subscription isn't slipped into the ranking.
  const defaults = parseComparisonFilters({});
  assert.deepEqual(filterGridOffers(offers, { ...noFlags, ...anyChoice }).map((offer) => offer.id), ["one-off"]);
  assert.deepEqual(comparedOffers(offers, defaults).map((offer) => offer.id), ["one-off"]);
  assert.equal(lowestTotalPence(offers, 50, 4), 2400, "price alerts compare the same one-off prices");
  // Choosing subscriptions shows those alone.
  const plans = parseComparisonFilters({ plan: "subscription" });
  assert.deepEqual(filterGridOffers(offers, { ...noFlags, ...anyChoice, purchaseModel: plans.purchaseModel }).map((offer) => offer.id), ["plan"]);
  assert.deepEqual(comparedOffers(offers, plans).map((offer) => offer.id), ["plan"]);
  // "?plan=one-off" is just the default, so it adds no filter.
  assert.equal(parseComparisonFilters({ plan: "one-off" }).purchaseModel, undefined);
});

test("§4.7 recurring plans bill every 28 days or monthly: the real interval is shown, never assumed", () => {
  const plan = publicOffer({ id: "plan", providerId: "a", purchaseModel: "RECURRING", billingPeriodDays: 28 });
  assert.equal(subscriptionTerms(plan)?.full, "Subscription: 4 tablets every 28 days");
  assert.equal(subscriptionTerms(plan)?.short, "every 28 days");
  // Not recorded: said plainly, not turned into "monthly".
  const unknown = publicOffer({ id: "unknown", providerId: "b", purchaseModel: "RECURRING" });
  assert.match(subscriptionTerms(unknown)?.full ?? "", /doesn't state how often/);
  assert.equal(subscriptionTerms(unknown)?.short, "interval not stated");
  assert.equal(subscriptionTerms(publicOffer({ id: "once", providerId: "c" })), null);
});
