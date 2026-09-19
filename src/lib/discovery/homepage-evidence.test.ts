import assert from "node:assert/strict";
import { test } from "node:test";

import { homepageEvidence } from "./homepage-evidence";

const candidate = { sourceRecordId: "1", name: "Example Pharmacy", postcode: "AB1 2CD", rawPayload: {} };
test("requires branch identity and extracts homepage delivery and telephone evidence", () => {
  const evidence = homepageEvidence('<h1>Example Pharmacy</h1><p>AB12CD. Free home delivery.</p><a href="tel:01234567890">Call</a>', candidate);
  assert.equal(evidence.verifiedIdentity, true);
  assert.equal(evidence.deliveryEvidence.length, 1);
  assert.deepEqual(evidence.phones, ["01234567890"]);
});
test("ignores script-only claims, negative delivery statements and unrelated branches", () => {
  const evidence = homepageEvidence('<h1>Example Pharmacy</h1><p>No delivery available.</p><script>AB12CD delivery</script>', candidate);
  assert.equal(evidence.verifiedIdentity, false);
  assert.deepEqual(evidence.deliveryEvidence, []);
});
