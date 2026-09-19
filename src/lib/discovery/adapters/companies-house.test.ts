import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { companiesHouseAdapter } from "./companies-house";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const credentials = { apiKey: "test-key" };

test("first-ever run scans the full population with no incorporated_from filter", async () => {
  const requests: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    return Response.json({ hits: 1, items: [{ company_number: "01234567", company_name: "Example Pharmacy Ltd" }] });
  };
  const records = await companiesHouseAdapter.run({ config: null, lastRunAt: null, credentials });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].searchParams.has("incorporated_from"), false);
  assert.equal(requests[0].searchParams.get("sic_codes"), "47730");
  assert.equal(requests[0].searchParams.get("company_status"), "active");
  assert.equal(requests[0].searchParams.get("size"), "5000");
  assert.equal(records.length, 1);
  assert.equal(records[0].companyNumber, "01234567");
});

test("later runs pass incorporated_from since lastRunAt", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("incorporated_from"), "2026-08-18");
    return Response.json({ hits: 0, items: [] });
  };
  const records = await companiesHouseAdapter.run({ config: null, lastRunAt: new Date("2026-08-18T12:00:00Z"), credentials });
  assert.deepEqual(records, []);
});

test("pages through the full result set using hits and start_index", async () => {
  const startIndexes: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    const startIndex = url.searchParams.get("start_index") ?? "0";
    startIndexes.push(startIndex);
    if (startIndex === "0") {
      return Response.json({ hits: 2, items: [{ company_number: "1" }] });
    }
    return Response.json({ hits: 2, items: [{ company_number: "2" }] });
  };
  const records = await companiesHouseAdapter.run({ config: null, lastRunAt: null, credentials });
  assert.deepEqual(startIndexes, ["0", "1"]);
  assert.deepEqual(records.map((r) => r.companyNumber), ["1", "2"]);
});

test("404 on the first page is a legitimate zero-result run", async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 });
  assert.deepEqual(await companiesHouseAdapter.run({ config: null, lastRunAt: null, credentials }), []);
});

test("404 on a later page stops pagination instead of failing the run", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return Response.json({ hits: 200, items: [{ company_number: "1" }] });
    return new Response(null, { status: 404 });
  };
  const records = await companiesHouseAdapter.run({ config: null, lastRunAt: null, credentials });
  assert.deepEqual(records.map((r) => r.companyNumber), ["1"]);
});

test("items missing company_number are skipped, not fabricated", async () => {
  globalThis.fetch = async () => Response.json({ hits: 1, items: [{ company_name: "No Number Ltd" }] });
  const records = await companiesHouseAdapter.run({ config: null, lastRunAt: null, credentials });
  assert.deepEqual(records, []);
});

test("non-404 failure responses surface status and body without looping", async () => {
  globalThis.fetch = async () => new Response("bad request detail", { status: 400, statusText: "Bad Request" });
  await assert.rejects(
    companiesHouseAdapter.run({ config: null, lastRunAt: null, credentials }),
    /400 Bad Request — bad request detail/,
  );
});

test("throws a clear error when no API key is configured", async () => {
  const originalEnv = process.env.COMPANIES_HOUSE_API_KEY;
  delete process.env.COMPANIES_HOUSE_API_KEY;
  await assert.rejects(
    companiesHouseAdapter.run({ config: null, lastRunAt: null, credentials: null }),
    /No Companies House API key configured/,
  );
  if (originalEnv !== undefined) process.env.COMPANIES_HOUSE_API_KEY = originalEnv;
});
