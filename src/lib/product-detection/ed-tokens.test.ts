import assert from "node:assert/strict";
import test from "node:test";

import { matchEdProductLinks } from "./detect-products";
import { matchEdProductLinkText, matchEdProductPath } from "./ed-tokens";

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

test("a product name shown on a link matches an opaque product path at MEDIUM confidence", () => {
  assert.deepEqual(matchEdProductLinkText("  Hezkue (Sildenafil)\n 50mg ", "/products/hezkue"), {
    ingredient: "SILDENAFIL",
    matchedTokens: ["sildenafil"],
    confidence: "MEDIUM",
  });
});

test("link text never matches the homepage, editorial paths or long card copy", () => {
  assert.equal(matchEdProductLinkText("Viagra", "/"), undefined);
  assert.equal(matchEdProductLinkText("Viagra vs Cialis", "/blog/viagra-vs-cialis"), undefined);
  assert.equal(matchEdProductLinkText(`Viagra ${"x".repeat(200)}`, "/products/p1"), undefined);
  assert.equal(matchEdProductLinkText("Hay fever tablets", "/products/p2"), undefined);
});

test("link text only fills in pages that the path or feed title did not already match", () => {
  const matches = matchEdProductLinks(
    [
      { url: "https://example.co.uk/treatments/viagra", text: "Cialis" },
      { url: "https://example.co.uk/products/hezkue", text: "Hezkue sildenafil" },
    ],
    [],
  );
  assert.deepEqual(matches.map((match) => [match.candidateUrl, match.matchedTokens, match.confidence]), [
    ["https://example.co.uk/treatments/viagra", ["viagra"], "HIGH"],
    ["https://example.co.uk/products/hezkue", ["sildenafil"], "MEDIUM"],
  ]);
});
