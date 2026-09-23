import assert from "node:assert/strict";
import test from "node:test";

import { collectDiscoveryHomepage } from "./homepage-collection";

const homepage = { title: "Pharmacy", finalUrl: "https://example.com/", html: "<html></html>" };

test("retries an aborted homepage and returns the successful verification input", async () => {
  let calls = 0;
  const result = await collectDiscoveryHomepage(homepage.finalUrl, async () => {
    if (++calls === 1) throw new DOMException("The operation was aborted", "AbortError");
    return homepage;
  });
  assert.equal(calls, 2);
  assert.equal(result, homepage);
});

test("repeated timeouts become a manual-review stop after exactly two attempts", async () => {
  for (const name of ["AbortError", "TimeoutError"]) {
    let calls = 0;
    await assert.rejects(collectDiscoveryHomepage(homepage.finalUrl, async () => {
      calls++;
      throw new DOMException("The operation was aborted", name);
    }), /timed out twice\. Review the page manually/);
    assert.equal(calls, 2);
  }
});

test("expired certificates become manual-review stops without retrying or bypassing TLS", async () => {
  const certificateError = Object.assign(new Error("TLS verification failed"), { code: "CERT_HAS_EXPIRED" });
  for (const failure of [
    new Error("certificate has expired"),
    certificateError,
    new TypeError("fetch failed", { cause: certificateError }),
  ]) {
    let calls = 0;
    await assert.rejects(collectDiscoveryHomepage(homepage.finalUrl, async () => {
      calls++;
      throw failure;
    }), error => error instanceof Error
      && /certificate has expired\. Review the page manually/.test(error.message)
      && error.cause === failure);
    assert.equal(calls, 1);
  }
});

test("does not retry or disguise policy stops or unexpected errors", async () => {
  for (const message of ["Website resolves to a restricted network address.", "robots rules", "Unexpected failure"]) {
    let calls = 0;
    const failure = new Error(message);
    await assert.rejects(collectDiscoveryHomepage(homepage.finalUrl, async () => {
      calls++;
      throw failure;
    }), error => error === failure);
    assert.equal(calls, 1);
  }
});
