import assert from "node:assert/strict";
import test from "node:test";

import { assertGoogleAiRequestLimit, googleAiCitationOrigins, googleAiCitationUrls, waitForGoogleAiCitationOrigins, waitForGoogleAiCitationUrls } from "./google-ai-citations";

test("recognizes Google's request limit with straight or curly apostrophes and wrapped text", () => {
  for (const body of [
    "You’ve reached the request limit for AI responses right now. Try again in a little while.",
    "You've reached the request limit for AI responses right now.",
    "You’ve reached the request limit\nfor AI responses right now.",
  ]) {
    assert.throws(() => assertGoogleAiRequestLimit(body), /request limit reached.*already saved are retained/);
  }
  assert.doesNotThrow(() => assertGoogleAiRequestLimit("No website found for this pharmacy."));
});

test("stops citation polling immediately when Google reports its request limit", async () => {
  let waits = 0;
  await assert.rejects(waitForGoogleAiCitationOrigins(
    async () => {
      assertGoogleAiRequestLimit("You’ve reached the request limit for AI responses right now.");
      return ["https://example.com/"];
    },
    async () => { waits++; },
  ), /Google AI Mode request limit reached/);
  assert.equal(waits, 0);
});

test("filters directories and normalizes direct and Google redirect citations", () => {
  assert.deepEqual([...googleAiCitationOrigins([
    "https://www.nhs.uk/pharmacy", "https://www.google.com/", "invalid",
    "https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fdelivery",
    "https://example.com/contact", "https://www.google.co.uk/url?url=https://pharmacy.example/",
    "http://insecure.example/", "javascript:void(0)",
  ])], ["https://example.com", "https://pharmacy.example"]);
  assert.deepEqual([...googleAiCitationUrls([
    "https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Ftreatments%2Fviagra",
    "https://example.com/products",
  ])], ["https://example.com/treatments/viagra", "https://example.com/products"]);
});

test("waits for usable full citation URLs", async () => {
  const urls = await waitForGoogleAiCitationUrls(
    async () => ["https://example.com/products"],
    async () => {},
  );
  assert.deepEqual([...urls], ["https://example.com/products"]);
});

test("waits past directory-only results for a usable citation", async () => {
  let reads = 0;
  let waits = 0;
  const origins = await waitForGoogleAiCitationOrigins(
    async () => ++reads === 1 ? ["https://www.nhs.uk/"] : ["https://example.com/"],
    async () => { waits++; },
  );
  assert.deepEqual([...origins], ["https://example.com"]);
  assert.equal(waits, 1);
});

test("returns no match after the bounded wait when all citations are excluded", async () => {
  let waits = 0;
  const origins = await waitForGoogleAiCitationOrigins(
    async () => ["https://www.nhs.uk/"],
    async () => { waits++; },
  );
  assert.equal(origins.size, 0);
  assert.equal(waits, 60);
});

test("does not swallow browser failures", async () => {
  const failure = new Error("Target page, context or browser has been closed");
  await assert.rejects(waitForGoogleAiCitationOrigins(
    async () => { throw failure; },
    async () => {},
  ), error => error === failure);
});
