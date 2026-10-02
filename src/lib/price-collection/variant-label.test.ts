import assert from "node:assert/strict";
import test from "node:test";

import { brandSideMatches, labelMatchesVariant, otcProductMismatch, preferPrescriptionLabels } from "./variant-label";

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

test("a single-strength OTC product named without its strength implies it", () => {
  // Withaid: "Viagra Connect 4 Tablets" — Viagra Connect is only ever 50mg.
  const connect = ["viagra connect", "sildenafil", "viagra"];
  assert.equal(labelMatchesVariant("Viagra Connect 4 Tablets", connect, { strengthMg: 50, packQuantity: 4 }), true);
  assert.equal(labelMatchesVariant("Viagra Connect 4 Tablets", connect, { strengthMg: 25, packQuantity: 4 }), false);
  assert.equal(labelMatchesVariant("Viagra Connect 4 Tablets", connect, { strengthMg: 50, packQuantity: 8 }), false);
  assert.equal(labelMatchesVariant("Cialis Together 4 Tablets", ["cialis together", "tadalafil"], { strengthMg: 10, packQuantity: 4 }), true);
  // A wrong strength in the label doesn't change which product it is (EveryDayMeds).
  assert.equal(labelMatchesVariant("Cialis Together 50mg Tablets - 4 Tablets", ["cialis together", "tadalafil", "cialis"], { strengthMg: 10, packQuantity: 4 }), true);
  assert.equal(labelMatchesVariant("Cialis Together 50mg Tablets - 8 Tablets", ["cialis together", "tadalafil", "cialis"], { strengthMg: 10, packQuantity: 4 }), false);
  assert.equal(labelMatchesVariant("Cialis Together 50mg Tablets - 4 Tablets", ["cialis", "tadalafil"], { strengthMg: 50, packQuantity: 4 }), false);
  // Prescription Viagra comes in several strengths, so it still needs one stated.
  assert.equal(labelMatchesVariant("Viagra 4 Tablets", ["viagra", "sildenafil"], { strengthMg: 50, packQuantity: 4 }), false);
});

test("over-the-counter and prescription products are never mixed up, either way round", () => {
  assert.equal(otcProductMismatch("Cialis Together | SynovaMed", ["cialis", "tadalafil"]), true);
  assert.equal(otcProductMismatch("Viagra Tablets", ["viagra connect", "sildenafil", "viagra"]), true);
  assert.equal(otcProductMismatch("Cialis Together | SynovaMed", ["cialis together", "tadalafil", "cialis"]), false);
  assert.equal(otcProductMismatch("Buy Viagra Online", ["viagra", "sildenafil"]), false);
});

test("reads a pack written count-first, e.g. '4 x 25mg'", () => {
  const tokens = ["viagra", "sildenafil"];
  assert.equal(labelMatchesVariant("Viagra Tablets 4 x 25mg", tokens, { strengthMg: 25, packQuantity: 4 }), true);
  assert.equal(labelMatchesVariant("Viagra Tablets 16 x 100mg", tokens, { strengthMg: 100, packQuantity: 16 }), true);
  assert.equal(labelMatchesVariant("Viagra Tablets 4 x 25mg", tokens, { strengthMg: 25, packQuantity: 25 }), false);
  assert.equal(labelMatchesVariant("Viagra Tablets 4 x 25mg", tokens, { strengthMg: 50, packQuantity: 4 }), false);
  assert.equal(labelMatchesVariant("Perrigo Sildenafil 50mg Film-Coated Tablets (4)", tokens, { strengthMg: 50, packQuantity: 4 }), true);
  assert.equal(labelMatchesVariant("Perrigo Sildenafil 50mg Film-Coated Tablets (8)", tokens, { strengthMg: 50, packQuantity: 4 }), false);
  // The strength-first form still reads as before.
  assert.equal(labelMatchesVariant("Viagra 50mg x 4", tokens, { strengthMg: 50, packQuantity: 4 }), true);
});

test("prefers the prescription brand over its over-the-counter version when both match", () => {
  const labels = ["Viagra Connect (50mg)[4 tablets]", "Viagra (50mg)[4 tablets]"];
  assert.deepEqual(preferPrescriptionLabels(labels, (label) => label), ["Viagra (50mg)[4 tablets]"]);
  assert.deepEqual(preferPrescriptionLabels(["Cialis Together 10mg 4 tablets"], (label) => label), ["Cialis Together 10mg 4 tablets"]);
});
