import assert from "node:assert/strict";
import test from "node:test";

import { assignedEnrichmentWorker } from "./enrichment-worker";

test("assigns the same source record to one stable AI worker", () => {
  const candidate = { sourceRecordId: "9012214", name: "Example Pharmacy", rawPayload: {} };
  assert.equal(assignedEnrichmentWorker("source-one", candidate), assignedEnrichmentWorker("source-one", candidate));
});

test("uses both workers across a source batch", () => {
  const workers = new Set(Array.from({ length: 100 }, (_, index) => assignedEnrichmentWorker("source-one", {
    sourceRecordId: String(index), name: "Example Pharmacy", rawPayload: {},
  }, true)));
  assert.deepEqual(workers, new Set(["GOOGLE_AI_MODE", "DEEPSEEK_WEB"]));
});

test("sends every candidate to Google AI while DeepSeek is paused", () => {
  const workers = new Set(Array.from({ length: 100 }, (_, index) => assignedEnrichmentWorker("source-one", {
    sourceRecordId: String(index), name: "Example Pharmacy", rawPayload: {},
  }, false)));
  assert.deepEqual(workers, new Set(["GOOGLE_AI_MODE"]));
});
