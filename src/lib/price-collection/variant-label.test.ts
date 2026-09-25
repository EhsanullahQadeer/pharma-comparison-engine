import assert from "node:assert/strict";
import test from "node:test";

import { brandSideMatches, preferPrescriptionLabels } from "./variant-label";

// Product names / option text as seen on live pharmacy pages.
test("option text that states branded or generic decides the side", () => {
  assert.equal(brandSideMatches("Viagra (Sildenafil) Tablets", "4 tablets Viagra (Branded) 50mg", "viagra", false), true);
  assert.equal(brandSideMatches("Viagra (Sildenafil) Tablets", "4 tablets Sildenafil (Generic) 50mg", "viagra", false), false);
  assert.equal(brandSideMatches("Viagra (Sildenafil) Tablets", "4 tablets Sildenafil (Generic) 50mg", "viagra", true), true);
  assert.equal(brandSideMatches("Cialis (Tadalafil) 10mg & 20mg Tablets", "Tadalafil (Generic Cialis) 10mg 4 tablets", "cialis", false), false);
  assert.equal(brandSideMatches("Viagra (Sildenafil)-Branded (Viagra)-50mg-4 Tablets", "Viagra (Sildenafil)-Branded (Viagra)-50mg-4 Tablets", "viagra", true), false);
});

test("without option wording, only a name that starts with the brand is branded", () => {
  // Seriva: generic sildenafil that mentions Viagra in brackets.
  assert.equal(brandSideMatches("Sildenafil (Viagra) Tablets", "25mg 4 tablets", "viagra", false), false);
  assert.equal(brandSideMatches("Sildenafil (Viagra) Tablets", "25mg 4 tablets", "viagra", true), true);
  // Razi Meds: branded Viagra whose options don't say so.
  assert.equal(brandSideMatches("Viagra (Sildenafil) Tablets", "50MG 4 tablets", "viagra", false), true);
  assert.equal(brandSideMatches("Viagra (Sildenafil) Tablets", "50MG 4 tablets", "viagra", true), false);
  assert.equal(brandSideMatches("Tadalafil Tablets (Generic Cialis)", "5mg 28 Tablets", "cialis", true), true);
  assert.equal(brandSideMatches("Sildenafil 100mg 8 Pack Subscription", "", "viagra", false), false);
  assert.equal(brandSideMatches("Viagra 50mg 4 Pack Subscription", "", "viagra", false), true);
});

test("unknown side or no brand token accepts either", () => {
  assert.equal(brandSideMatches("Sildenafil (Viagra) Tablets", "25mg 4 tablets", "viagra", undefined), true);
  assert.equal(brandSideMatches("Sildenafil Tablets", "25mg", undefined, false), true);
});

test("prefers the prescription brand over its over-the-counter version when both match", () => {
  const labels = ["Viagra Connect (50mg)[4 tablets]", "Viagra (50mg)[4 tablets]"];
  assert.deepEqual(preferPrescriptionLabels(labels, (label) => label), ["Viagra (50mg)[4 tablets]"]);
  assert.deepEqual(preferPrescriptionLabels(["Cialis Together 10mg 4 tablets"], (label) => label), ["Cialis Together 10mg 4 tablets"]);
});
