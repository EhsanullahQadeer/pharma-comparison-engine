import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { cqcAdapter } from "./cqc";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const context = { config: null, lastRunAt: null, credentials: { subscriptionKey: "test-key" } };

test("reads all pages, enriches relevant providers and preserves identifier meaning", async () => {
  const requests: string[] = [];
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    requests.push(url.pathname + url.search);
    assert.equal(url.origin, "https://api.service.cqc.org.uk");
    assert.equal(new Headers(options?.headers).get("Ocp-Apim-Subscription-Key"), "test-key");
    assert.equal(url.searchParams.has("partnerCode"), false);
    if (url.pathname.endsWith("/providers")) {
      const page = Number(url.searchParams.get("page"));
      const providers = {
        1: [{ providerId: "p1", providerName: "Example Pharmacy" }, { providerId: "other", providerName: "Care Home" }],
        2: [{ providerId: "p1", providerName: "Example Pharmacy" }, { providerId: "p2", providerName: "Example Chemist" }],
      }[page];
      return Response.json({ page, totalPages: 2, providers });
    }
    const providerId = url.pathname.split("/").at(-1);
    return Response.json({ providerId, name: "Example Pharmacy", website: "https://www.example.com/services/", postalCode: "AB1 2CD", companiesHouseNumber: "01234567", odsCode: "ABC12" });
  };
  const records = await cqcAdapter.run(context);
  assert.equal(records.length, 2);
  assert.equal(requests.length, 4);
  assert.equal(records[0].websiteDomain, "www.example.com");
  assert.equal(records[0].companyNumber, "01234567");
  assert.equal(records[0].odsCode, "ABC12");
  assert.equal(records[0].sourceRecordId, "p1");
  assert.equal(records[0].cqcLocationId, undefined);
});

test("malformed pages fail instead of reporting zero candidates", async () => {
  globalThis.fetch = async () => Response.json({ message: "Unexpected response" });
  await assert.rejects(cqcAdapter.run(context), /unexpected providers page/);
});

test("repeated pagination fails instead of looping", async () => {
  globalThis.fetch = async () => Response.json({ page: 1, totalPages: 2, providers: [{ providerId: "p1", providerName: "Care Home" }] });
  await assert.rejects(cqcAdapter.run(context), /unexpected providers page/);
});

test("empty register is a successful empty result", async () => {
  globalThis.fetch = async () => Response.json({ page: 1, totalPages: 0, providers: [] });
  assert.deepEqual(await cqcAdapter.run(context), []);
});

test("authentication and throttling errors do not expose echoed credentials", async () => {
  for (const status of [401, 403, 429, 500]) {
    globalThis.fetch = async () => new Response("test-key", { status });
    await assert.rejects(cqcAdapter.run(context), (error: Error) => {
      assert.match(error.message, new RegExp(String(status)));
      assert.equal(error.message.includes("test-key"), false);
      return true;
    });
  }
});

test("missing details fail the run instead of silently losing a candidate", async () => {
  globalThis.fetch = async (input) => {
    if (String(input).includes("?")) return Response.json({ page: 1, totalPages: 1, providers: [{ providerId: "p1", providerName: "Pharmacy" }] });
    return Response.json({ providerId: "wrong", name: "Pharmacy" });
  };
  await assert.rejects(cqcAdapter.run(context), /unexpected provider details/);
});
