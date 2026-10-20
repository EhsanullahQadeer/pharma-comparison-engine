import assert from "node:assert/strict";
import { test } from "node:test";

import { isoWeek, scheduledPhoneLayout } from "./phone-layout";

test("ISO week numbers, including the year boundary", () => {
  assert.equal(isoWeek(new Date("2026-10-19T00:00:00Z")), 43);
  assert.equal(isoWeek(new Date("2026-10-25T23:59:00Z")), 43);
  assert.equal(isoWeek(new Date("2026-10-26T00:00:00Z")), 44);
  assert.equal(isoWeek(new Date("2027-01-01T12:00:00Z")), 53, "1 Jan 2027 is a Friday, so it's in 2026's week 53");
  assert.equal(isoWeek(new Date("2027-01-04T12:00:00Z")), 1);
});

test("layouts alternate by week unless one is pinned", () => {
  assert.equal(scheduledPhoneLayout(new Date("2026-10-20T12:00:00Z"), undefined), "compact");
  assert.equal(scheduledPhoneLayout(new Date("2026-10-27T12:00:00Z"), undefined), "swipe");
  assert.equal(scheduledPhoneLayout(new Date("2026-10-27T12:00:00Z"), "compact"), "compact");
  assert.equal(scheduledPhoneLayout(new Date("2026-10-20T12:00:00Z"), "nonsense"), "compact");
});
