import assert from "node:assert/strict";
import { test } from "node:test";

import { buildTrackedUrl, linkTemplateError } from "./affiliate-links";

test("tracked links substitute only the product URL and click id", () => {
  const awin = "https://www.awin1.com/cread.php?awinmid=123&awinaffid=456&clickref={clickRef}&ued={url}";
  assert.equal(linkTemplateError(awin), null);
  assert.equal(
    buildTrackedUrl(awin, "https://www.pharmacy.co.uk/sildenafil?pack=8", "click_1"),
    "https://www.awin1.com/cread.php?awinmid=123&awinaffid=456&clickref=click_1&ued=https%3A%2F%2Fwww.pharmacy.co.uk%2Fsildenafil%3Fpack%3D8",
  );
  assert.equal(buildTrackedUrl("{rawUrl}?ref=us&sub={clickRef}", "https://p.co.uk/a", "c1"), "https://p.co.uk/a?ref=us&sub=c1");
  assert.equal(buildTrackedUrl("{rawUrl}?ref=us", "https://p.co.uk/a?pack=8", "c1"), "https://p.co.uk/a?pack=8&ref=us");
});

test("link templates are validated before they can be saved", () => {
  assert.equal(linkTemplateError("{rawUrl}?ref=us"), null);
  assert.match(linkTemplateError("https://network.test/?id=1") ?? "", /Include \{url\}/);
  assert.match(linkTemplateError("https://network.test/?u={url}&q={search}") ?? "", /Unknown placeholder \{search\}/);
  assert.match(linkTemplateError("https://network.test/?u={rawUrl}") ?? "", /very start/);
  assert.match(linkTemplateError("http://network.test/?u={url}") ?? "", /https/);
  assert.match(linkTemplateError("https://network.test/?u={url") ?? "", /unmatched/);
  assert.match(linkTemplateError("javascript:{url}") ?? "", /https/);
});
