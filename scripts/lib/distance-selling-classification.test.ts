import assert from "node:assert/strict";
import test from "node:test";

import { classifyDistanceSellingCandidate, type CandidateForClassification, type LatestReview } from "./distance-selling-classification";

const candidate: CandidateForClassification = {
  gphcNumber: "1234567", tradingName: "Example Pharmacy", premisesType: "Internet",
  distanceSellingSignal: "HIGH", address: { postcode: "AB12CD" },
};

test("unresearched register candidates do not acquire inferred product labels", () => {
  const result = classifyDistanceSellingCandidate(candidate);
  assert.equal(result.researchStatus, "UNRESEARCHED");
  assert.equal(result.categories.publicListing, "UNRESEARCHED");
  assert.equal(result.categories.classificationSource, "UNRESEARCHED");
  assert.equal(result.categories.distanceSellingEvidence, "GPHC_INTERNET_PREMISES");
});

test("structured ChatGPT labels take precedence over prose inference", () => {
  const review: LatestReview = {
    sourceGoogleSequence: 4, checkedAt: "2026-09-26T00:00:00Z",
    decision: {
      gphcNumber: "1234567", pharmacyName: "Example Pharmacy", status: "REJECTED",
      officialWebsite: "https://example.com", officialProductUrl: null, listedProductOrTreatment: null,
      phone: null, deliveryOptions: null, evidenceUrls: ["https://example.com/shop"],
      reason: "An official shop is advertised but no direct product listing was corroborated.",
      confidence: "MEDIUM", followUpGoogleQuery: null,
      classification: {
        version: 2, publicListing: "SHOP_CLAIM_NO_DIRECT_URL", erectileDysfunction: "NOT_CONFIRMED",
        listingBreadth: "UNKNOWN", treatmentAreas: [], listedExamples: [],
        purchaseJourney: "UNKNOWN", fulfilmentMethods: ["HOME_DELIVERY"], deliveryCoverage: "UNKNOWN",
        medicineSupply: [], orderChannels: [], priceVisibility: "NOT_CONFIRMED",
        evidenceUrlsByLabel: { publicListing: ["https://example.com/shop"], HOME_DELIVERY: ["https://example.com/shop"] },
      },
    },
  };
  const result = classifyDistanceSellingCandidate(candidate, review);
  assert.equal(result.categories.publicListing, "SHOP_CLAIM_NO_DIRECT_URL");
  assert.equal(result.categories.classificationSource, "CHATGPT_STRUCTURED");
  assert.equal(result.categories.needsManualReview, true);
  assert.deepEqual(result.categories.evidenceUrlsByLabel.publicListing, ["https://example.com/shop"]);
  assert.deepEqual(result.categories.fulfilmentMethods, ["HOME_DELIVERY"]);
  assert.equal(result.categories.classificationSchemaVersion, 2);
});

test("unresolved positive claims stay in the decision but not in usable filter categories", () => {
  const review: LatestReview = {
    sourceGoogleSequence: 53, checkedAt: "2026-09-26T00:00:00Z",
    decision: {
      gphcNumber: "1234567", pharmacyName: "Example Pharmacy", status: "NEEDS_REVIEW",
      officialWebsite: "https://example.com", officialProductUrl: null, listedProductOrTreatment: "Example treatment",
      phone: null, deliveryOptions: "Home delivery", evidenceUrls: ["https://example.com/"],
      reason: "A newly found listing URL still needs corroboration.", confidence: "MEDIUM", followUpGoogleQuery: null,
      classification: {
        version: 2, publicListing: "SHOP_CLAIM_NO_DIRECT_URL", erectileDysfunction: "NOT_CONFIRMED",
        listingBreadth: "MULTIPLE_TREATMENT_EXAMPLES", treatmentAreas: ["TRAVEL_HEALTH"], listedExamples: ["A", "B"],
        purchaseJourney: "DIRECT_CHECKOUT", fulfilmentMethods: ["HOME_DELIVERY"], deliveryCoverage: "UK_WIDE",
        medicineSupply: ["PRIVATE_PRESCRIPTIONS"], orderChannels: ["WEBSITE"], priceVisibility: "NOT_CONFIRMED",
        evidenceUrlsByLabel: { publicListing: ["https://example.com/"], TRAVEL_HEALTH: ["https://example.com/"] },
      },
    },
  };
  const result = classifyDistanceSellingCandidate(candidate, review);
  assert.equal(result.categories.classificationSource, "CHATGPT_UNRESOLVED");
  assert.equal(result.categories.needsManualReview, true);
  assert.equal(result.categories.listingBreadth, "UNKNOWN");
  assert.deepEqual(result.categories.treatmentAreas, []);
  assert.deepEqual(result.categories.fulfilmentMethods, []);
  assert.equal(result.categories.purchaseJourney, "UNKNOWN");
  assert.equal(result.categories.publicListing, "NO_DIRECT_URL");
});
