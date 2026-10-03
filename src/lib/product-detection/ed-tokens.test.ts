import assert from "node:assert/strict";
import test from "node:test";

import { matchEdProductLinks } from "./detect-products";
import { isEdCategoryPagePath, matchEdProductLinkText, matchEdProductPath } from "./ed-tokens";

test("recognizes Peak's medication product path", () => {
  assert.deepEqual(matchEdProductPath("/medications/sildenafil-generic-viagra"), {
    ingredient: "SILDENAFIL",
    matchedTokens: ["sildenafil", "viagra"],
    confidence: "HIGH",
  });
});

test("medication paths still exclude editorial pages and unrelated products", () => {
  assert.equal(matchEdProductPath("/medications/blog/sildenafil-generic-viagra"), undefined);
  // Simple Online Pharmacy's article hub nests under the condition folder.
  assert.equal(matchEdProductPath("/health-advice/erectile-dysfunction/viagra/how-does-viagra-work/"), undefined);
  assert.equal(matchEdProductPath("/health-advice/erectile-dysfunction/sildenafil/"), undefined);
  assert.equal(matchEdProductPath("/online-doctor/erectile-dysfunction/viagra/")?.confidence, "HIGH");
  assert.equal(matchEdProductPath("/medications/paracetamol"), undefined);
});

test("recognizes flat product pages under a UK locale folder (Zava)", () => {
  for (const path of ["/uk/viagra.html", "/uk/sildenafil-tablets.html", "/uk/cialis-tablets.html", "/uk/tadalafil.html", "/uk/cialis-daily.html", "/uk/viagra-connect.html", "/viagra-100mg"]) {
    assert.equal(matchEdProductPath(path)?.confidence, "HIGH", path);
  }
  assert.equal(matchEdProductPath("/uk/cialis-daily.html")?.ingredient, "TADALAFIL");
});

test("a token buried inside another word never matches (Well)", () => {
  assert.equal(matchEdProductPath("/shop/health/specialist-skincare/"), undefined);
  assert.equal(matchEdProductPath("/treatments/viagraconnect")?.confidence, "HIGH");
  // Well's flat subscription product pages.
  assert.equal(matchEdProductPath("/sildenafil-100mg-8-pack-subscription/")?.ingredient, "SILDENAFIL");
  assert.equal(matchEdProductPath("/tadalafil-daily-5mg-28-pack-subscription/")?.ingredient, "TADALAFIL");
});

test("articles and PDF leaflets under a condition folder aren't product pages (Medicina, Dr Fox)", () => {
  for (const path of ["/erectile-dysfunction/how-sildenafil-works", "/erectile-dysfunction/sildenafil-vs-viagra", "/erectile-dysfunction/is-sildenafil-25mg-enough", "/erectile-dysfunction/alcohol-and-sildenafil", "/erectile-dysfunction/common-mistakes-when-taking-sildenafil", "/erectile-dysfunction/sildenafil-safety-information", "/erectile-dysfunction/sildenafil-dosage-guide", "/pdf/erectile-dysfunction/mylan-tadalafil-PIL.pdf"]) {
    assert.equal(matchEdProductPath(path), undefined, path);
  }
  // Product pages in the same folder still match.
  for (const path of ["/erectile-dysfunction/sildenafil-50mg", "/erectile-dysfunction/tadalafil-20mg", "/erectile-dysfunction/sildenafil-tablets", "/erectile-dysfunction/sildenafil-generic-viagra", "/product/23685522/tadalafil-tablets-for-erectile-dysfunction"]) {
    assert.equal(matchEdProductPath(path)?.confidence, "HIGH", path);
  }
});

test("flat pages exclude information pages, other countries and unrelated products", () => {
  for (const path of ["/uk/viagra-side-effects.html", "/uk/viagra-dosage.html", "/uk/viagra-alternatives.html", "/uk/viagra-doesnt-work.html", "/fr/viagra.html", "/de/sildenafil.html", "/uk/erectile-dysfunction-treatment.html", "/uk/paracetamol.html", "/uk/viagra-vs-cialis.html"]) {
    assert.equal(matchEdProductPath(path), undefined, path);
  }
});

test("recognizes ED condition pages by address, not consultation or trial-pack pages", () => {
  for (const path of ["/erectile-dysfunction", "/ed", "/uk/erectile-dysfunction-treatment.html", "/erectile-dysfunction-treatments"]) assert.equal(isEdCategoryPagePath(path), true, path);
  for (const path of ["/uk/erectile-dysfunction-consultation.html", "/uk/erectile-dysfunction-trial-pack.html", "/fr/erectile-dysfunction-treatment.html", "/blog/erectile-dysfunction", "/uk/viagra.html", "/"]) assert.equal(isEdCategoryPagePath(path), false, path);
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
  // Zava's condition page links its information pages by drug name.
  assert.equal(matchEdProductLinkText("Viagra side effects", "/uk/viagra-side-effects.html"), undefined);
  assert.equal(matchEdProductLinkText("Cialis dosage", "/uk/cialis-dosage.html"), undefined);
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

test("an ED page may sit under a health-section folder (Phlo Clinic)", () => {
  assert.equal(isEdCategoryPagePath("/male-health/erectile-dysfunction"), true);
  assert.equal(isEdCategoryPagePath("/online-doctor/erectile-dysfunction/"), true);
  assert.equal(isEdCategoryPagePath("/male-health/hair-loss"), false);
  assert.equal(isEdCategoryPagePath("/health-advice/erectile-dysfunction"), false);
});
