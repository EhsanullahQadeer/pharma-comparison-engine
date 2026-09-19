import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { nhsOdsAdapter } from "./nhs-ods";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("recent runs use ORD's bare date format and retain returned pharmacies", async () => {
  const lastRunAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("LastChangeDate"), lastRunAt.toISOString().slice(0, 10));
    assert.equal(url.searchParams.get("Roles"), "RO182");
    return Response.json({ Organisations: [{ OrgId: "F1234", Name: "Example Pharmacy", PostCode: "AB1 2CD" }] });
  };
  const records = await nhsOdsAdapter.run({ lastRunAt, config: null, credentials: null });
  assert.equal(records.length, 1);
  assert.equal(records[0].odsCode, "F1234");
});

test("first runs and expired lookbacks omit the restricted date filter", async () => {
  globalThis.fetch = async (input) => {
    assert.equal(new URL(String(input)).searchParams.has("LastChangeDate"), false);
    return Response.json({ Organisations: [] });
  };
  for (const lastRunAt of [null, new Date(Date.now() - 186 * 24 * 60 * 60 * 1000)]) {
    assert.deepEqual(await nhsOdsAdapter.run({ lastRunAt, config: null, credentials: null }), []);
  }
});
