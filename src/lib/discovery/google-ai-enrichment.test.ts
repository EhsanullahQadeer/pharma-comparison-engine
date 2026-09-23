import assert from "node:assert/strict";
import test from "node:test";

import { extractGoogleAiGphcNumber, googleAiProductListingUrls, isManualReviewCollectionStop } from "./google-ai-enrichment";

test("treats inaccessible homepages as candidate-level manual review stops", () => {
  assert.equal(isManualReviewCollectionStop(new Error("Too many redirects. Review this website manually.")), true);
  assert.equal(isManualReviewCollectionStop(new Error("Homepage verification timed out twice. Review the page manually.")), true);
  assert.equal(isManualReviewCollectionStop(new Error("Homepage certificate has expired. Review the page manually.")), true);
  assert.equal(isManualReviewCollectionStop(new Error("Website resolves to a restricted network address.")), true);
  assert.equal(isManualReviewCollectionStop(new Error("Unexpected database failure.")), false);
});

test("extracts GPhC registration numbers from Google AI answer text", () => {
  assert.equal(extractGoogleAiGphcNumber("Official site example.com. GPhC pharmacy registration number: 9012214."), "9012214");
  assert.equal(extractGoogleAiGphcNumber("Premises registration number is 1091717 with the General Pharmaceutical Council."), "1091717");
  assert.equal(extractGoogleAiGphcNumber("ODS FPE63 and postcode S44 6AE, but no regulator number shown."), undefined);
});

test("keeps only direct official product-listing citations for the AI prefilter", () => {
  assert.deepEqual(googleAiProductListingUrls([
    "https://pharmacy.example/",
    "https://pharmacy.example/treatments/viagra",
    "https://pharmacy.example/blog/viagra-guide",
    "https://pharmacy.example/products",
  ]), ["https://pharmacy.example/treatments/viagra", "https://pharmacy.example/products"]);
});
