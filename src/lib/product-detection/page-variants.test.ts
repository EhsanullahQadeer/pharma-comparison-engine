import assert from "node:assert/strict";
import test from "node:test";

import { pageAffinity } from "./page-variants";

const base = "https://www.cloudpharmacy.co.uk/products";
const generic = { ingredient: "TADALAFIL", brandName: "Cialis", generic: true } as const;
const branded = { ingredient: "TADALAFIL", brandName: "Cialis", generic: false } as const;
const together = { ingredient: "TADALAFIL", brandName: "Cialis Together", generic: false } as const;

test("an option belongs on the page whose address names its product", () => {
  // Cloud Pharmacy lists Cialis and Cialis Together prices in a comparison table on its tadalafil page.
  assert.equal(pageAffinity(`${base}/tadalafil/`, generic), 2);
  assert.equal(pageAffinity(`${base}/cialis-tablets/`, generic), 1);
  assert.equal(pageAffinity(`${base}/cialis-tablets/`, branded), 2);
  assert.equal(pageAffinity(`${base}/tadalafil/`, branded), 1);
  assert.equal(pageAffinity(`${base}/cialis-together/`, together), 2);
  assert.equal(pageAffinity(`${base}/tadalafil/`, together), 1);
});

test("an over-the-counter product's page is the last choice for the prescription product", () => {
  assert.equal(pageAffinity(`${base}/cialis-together/`, branded), 0);
  assert.equal(pageAffinity("https://www.doctorfox.co.uk/erectile-dysfunction/viagra-connect-tablets.html", { ingredient: "SILDENAFIL", brandName: "Viagra", generic: true }), 0);
});
