import assert from "node:assert/strict";
import { test } from "node:test";

import { parseClickReportRange } from "@/lib/click-report-range";

const now = new Date(2026, 9, 2, 15, 30);

test("no params fall back to the last 30 days, starting at midnight", () => {
  const range = parseClickReportRange({}, now);
  assert.equal(range.preset, "30d");
  assert.deepEqual(range.from, new Date(2026, 8, 3));
  assert.equal(range.to, null);
  assert.equal(range.label, "Last 30 days");
});

test("a preset counts today as its last day; all time has no start", () => {
  assert.deepEqual(parseClickReportRange({ range: "7d" }, now).from, new Date(2026, 8, 26));
  assert.equal(parseClickReportRange({ range: "all" }, now).from, null);
  assert.equal(parseClickReportRange({ range: "nonsense" }, now).preset, "30d");
});

test("custom dates win over a preset and include the whole last day", () => {
  const range = parseClickReportRange({ range: "7d", from: "2026-09-01", to: "2026-09-30" }, now);
  assert.equal(range.preset, null);
  assert.deepEqual(range.from, new Date(2026, 8, 1));
  assert.deepEqual(range.to, new Date(2026, 9, 1));
  assert.equal(range.fromInput, "2026-09-01");
  assert.equal(range.toInput, "2026-09-30");
});

test("dates entered the wrong way round are swapped", () => {
  const range = parseClickReportRange({ from: "2026-09-30", to: "2026-09-01" }, now);
  assert.deepEqual(range.from, new Date(2026, 8, 1));
  assert.deepEqual(range.to, new Date(2026, 9, 1));
});

test("one date leaves the other side open; an impossible date is ignored", () => {
  const fromOnly = parseClickReportRange({ from: "2026-09-10" }, now);
  assert.deepEqual(fromOnly.from, new Date(2026, 8, 10));
  assert.equal(fromOnly.to, null);
  assert.equal(parseClickReportRange({ from: "2026-02-31" }, now).preset, "30d");
});
