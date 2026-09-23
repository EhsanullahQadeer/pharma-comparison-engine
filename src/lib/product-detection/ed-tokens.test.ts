import assert from "node:assert/strict";
import test from "node:test";

import { matchEdProductPath } from "./ed-tokens";

test("recognizes Peak's medication product path", () => {
  assert.deepEqual(matchEdProductPath("/medications/sildenafil-generic-viagra"), {
    ingredient: "SILDENAFIL",
    matchedTokens: ["sildenafil", "viagra"],
    confidence: "HIGH",
  });
});

test("medication paths still exclude editorial pages and unrelated products", () => {
  assert.equal(matchEdProductPath("/medications/blog/sildenafil-generic-viagra"), undefined);
  assert.equal(matchEdProductPath("/medications/paracetamol"), undefined);
});
