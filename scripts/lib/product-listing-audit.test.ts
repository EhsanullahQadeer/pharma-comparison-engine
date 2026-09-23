import assert from "node:assert/strict";
import test from "node:test";

import { assessProductListing, hasProductListingPath } from "./product-listing-audit";

test("identifies product listing paths", () => {
  assert.equal(hasProductListingPath("https://example.com/treatments/viagra"), true);
  assert.equal(hasProductListingPath("https://example.com/blog/viagra-guide"), false);
});

test("requires product evidence before classifying a pharmacy as product-listing", () => {
  const result = assessProductListing("<main>Online pharmacy</main>", [{
    url: "https://example.com/treatments/viagra",
    html: '<button>Add to basket</button><span>£19.99</span>',
  }]);
  assert.equal(result.classification, "PRODUCT_LISTING");
});

test("keeps prescription-first pharmacies separate from sites with no clear evidence", () => {
  assert.equal(assessProductListing("A consultation is required before treatment.", []).classification, "PRESCRIPTION_FIRST");
  assert.equal(assessProductListing("Local pharmacy services", []).classification, "NO_PRODUCT_LISTING");
});
