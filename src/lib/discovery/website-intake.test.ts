import assert from "node:assert/strict";
import { test } from "node:test";

import { gphcNumberFromPage, intakeDomain, intakeName } from "./website-intake";

test("domains are normalised the way discovery and providers store them", () => {
  assert.equal(intakeDomain("https://www.Example-Pharmacy.co.uk/ed?x=1"), "example-pharmacy.co.uk");
  assert.equal(intakeDomain("example-pharmacy.co.uk"), "example-pharmacy.co.uk");
});

test("a GPhC number printed on the page is picked up, nothing else", () => {
  assert.equal(gphcNumberFromPage("<footer>GPhC registration number: <b>9012345</b></footer>"), "9012345");
  assert.equal(gphcNumberFromPage("<p>Registered with the GPhC, no. 1234567</p>"), "1234567");
  assert.equal(gphcNumberFromPage("<p>Call 0800 123 4567</p>"), null);
});

test("names come from the page title, without its tagline", () => {
  assert.equal(intakeName("Example Pharmacy | Buy ED treatment online", "example.co.uk"), "Example Pharmacy");
  assert.equal(intakeName(undefined, "example.co.uk"), "example.co.uk");
  assert.equal(intakeName("Doorstep Pharmacy &#8211; Harrow&#039;s NHS online pharmacy", "doorsteppharmacy.com"), "Doorstep Pharmacy");
  assert.equal(intakeName("Smith &amp; Sons Chemist", "smith.co.uk"), "Smith & Sons Chemist");
});
