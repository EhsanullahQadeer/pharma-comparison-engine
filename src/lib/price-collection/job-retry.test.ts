import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyJobFailure, MAX_JOB_ATTEMPTS, retryDelayMs } from "@/lib/price-collection/job-retry";

test("retries follow 5 / 15 / 60 minutes", () => {
  const noJitter = () => 0.5;
  assert.equal(retryDelayMs(1, noJitter), 5 * 60_000);
  assert.equal(retryDelayMs(2, noJitter), 15 * 60_000);
  assert.equal(retryDelayMs(3, noJitter), 60 * 60_000);
});

test("jitter stays within ±20%", () => {
  assert.equal(retryDelayMs(1, () => 0), 4 * 60_000);
  assert.equal(retryDelayMs(1, () => 1), 6 * 60_000);
});

test("temporary network and server failures retry", () => {
  for (const message of [
    "The operation was aborted due to timeout",
    "read ECONNRESET",
    "getaddrinfo EAI_AGAIN example.co.uk",
    "Collection stopped (HTTP 503). Review the page manually.",
    "Collection stopped (HTTP 429). Review the page manually.",
    "page.goto: Timeout 30000ms exceeded.",
  ]) assert.equal(classifyJobFailure(message, 1), "RETRY", message);
});

test("blocks, refusals and missing prices go to review without retrying", () => {
  assert.equal(classifyJobFailure("Page contains a human-verification challenge or CAPTCHA marker.", 1), "HUMAN_VERIFICATION_REQUIRED");
  assert.equal(classifyJobFailure("Rendered page requires manual verification.", 1), "HUMAN_VERIFICATION_REQUIRED");
  assert.equal(classifyJobFailure("Collection stopped: robots rules could not be confirmed or do not permit this page. Review it manually.", 1), "FAILED");
  assert.equal(classifyJobFailure("Collection stopped (HTTP 404). Review the page manually.", 1), "FAILED");
  assert.equal(classifyJobFailure("No matching strength and pack-size GBP price row found for this variant.", 1), "FAILED");
});

test("a temporary failure stops retrying once attempts run out", () => {
  assert.equal(classifyJobFailure("read ECONNRESET", MAX_JOB_ATTEMPTS - 1), "RETRY");
  assert.equal(classifyJobFailure("read ECONNRESET", MAX_JOB_ATTEMPTS), "FAILED");
});
