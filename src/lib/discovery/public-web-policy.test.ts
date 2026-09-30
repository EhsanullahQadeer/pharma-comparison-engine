import assert from "node:assert/strict";
import test from "node:test";

import { isHumanVerificationPage, normalizePublicUrl, robotsAllows } from "./public-web-policy";

// Trimmed from Dr Fox's robots.txt: the catch-all group blocks a few paths, and a list of named
// bots (one of them "rma") is blocked everywhere.
const drFoxRobots = `User-agent: *
Disallow: /order*
Disallow: /privacy.html

User-agent: Teoma
Disallow: /
User-agent: rma
Disallow: /`;

test("a group for another bot whose name is part of ours doesn't apply to us", () => {
  assert.equal(robotsAllows(drFoxRobots, "/medications-online-prescriptions.html"), true);
  assert.equal(robotsAllows(drFoxRobots, "/viagra.html"), true);
  assert.equal(robotsAllows(drFoxRobots, "/order/checkout"), false);
  assert.equal(robotsAllows(drFoxRobots, "/privacy.html"), false);
});

test("a group naming us exactly still applies", () => {
  assert.equal(robotsAllows(`${drFoxRobots}\nUser-agent: PharmaCompareDiscovery\nDisallow: /`, "/viagra.html"), false);
});

const content = `<h1>Viagra Tablets</h1><p>${"Viagra is a prescription treatment for erectile dysfunction. ".repeat(40)}</p>`;

test("a real page with a reCAPTCHA field on a form is not a verification wall", () => {
  // Pharmulous: a hidden recaptcha input on the newsletter sign-up form.
  assert.equal(isHumanVerificationPage(`${content}<form><input type="hidden" id="recaptcha" name="recaptcha"></form>`), false);
  assert.equal(isHumanVerificationPage(content), false);
});

test("verification interstitials and near-empty CAPTCHA pages are walls", () => {
  assert.equal(isHumanVerificationPage(`<title>Just a moment...</title><script>window._cf_chl_opt={}</script>`), true);
  assert.equal(isHumanVerificationPage(`${content}<p>Checking your browser before accessing the site.</p>`), true);
  assert.equal(isHumanVerificationPage(`<h1>Access denied</h1><div class="g-recaptcha"></div><p>Please complete the captcha to continue.</p>`), true);
});

test("addresses keep their query string, and robots rules can match on it", () => {
  assert.equal(normalizePublicUrl("https://well.co.uk/xmlsitemap.php?type=products&page=1#top").href, "https://well.co.uk/xmlsitemap.php?type=products&page=1");
  assert.equal(robotsAllows("User-agent: *\nDisallow: /search.php", "/search.php?products_index_prod%5Bquery%5D=viagra"), false);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /*?sort=", "/viagra/?sort=price"), false);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /*?sort=", "/viagra/"), true);
});
