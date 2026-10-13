import assert from "node:assert/strict";
import test from "node:test";

import { visibleBrowserGaveUp, worthVisibleBrowserRetry } from "./scrape-escalation";

test("a blocked or empty automatic check is retried in the visible window", () => {
  assert.equal(worthVisibleBrowserRetry("Rendered page requires manual verification."), true);
  assert.equal(worthVisibleBrowserRetry("The product page did not finish loading. Retry human-assisted scraping."), true);
  assert.equal(worthVisibleBrowserRetry("No matching strength and pack-size GBP price row found for this variant."), true);
});

test("failures the visible window cannot change are not retried", () => {
  assert.equal(worthVisibleBrowserRetry("The site's robots rules do not permit collecting this page."), false);
  assert.equal(worthVisibleBrowserRetry("Rejected impossible scraped price £0.24 for 4 tablets (under 10p a tablet); the previous price was kept."), false);
  assert.equal(worthVisibleBrowserRetry("This pharmacy already has a price for this product, collected from https://example.com/a."), false);
  assert.equal(worthVisibleBrowserRetry("You are not authorized to run price collection."), false);
});

test("an unanswered security check stops further visible-window tries for that pharmacy", () => {
  assert.equal(visibleBrowserGaveUp("Verification was not completed within five minutes. Retry human-assisted scraping."), true);
  assert.equal(visibleBrowserGaveUp("The website keeps returning to Cloudflare verification. Scraping stopped without retrying or reloading."), true);
  assert.equal(visibleBrowserGaveUp("No matching strength and pack-size GBP price row found for this variant."), false);
});
