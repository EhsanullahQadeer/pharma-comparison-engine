import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "playwright";

import { HumanVerificationError, isVerificationPage, waitForHumanVerification } from "./human-browser";

test("recognizes Peak's security check", () => {
  assert.equal(isVerificationPage("Performing security verification"), true);
  assert.equal(isVerificationPage("Just a moment..."), true);
  assert.equal(isVerificationPage("Sildenafil 50mg 4 tablets £12.00"), false);
});

test("stops recurring challenges instead of advancing during a brief clear page", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent("<title>Pharmacy</title><p>Product page</p>");
    const rejected = assert.rejects(waitForHumanVerification(page, true), error =>
      error instanceof HumanVerificationError && /keeps returning/.test(error.message));
    for (let cycle = 0; cycle < 3; cycle++) {
      await page.waitForTimeout(1_200);
      await page.setContent("<title>Just a moment...</title><p>Performing security verification</p>");
      await page.waitForTimeout(1_200);
      if (cycle < 2) await page.setContent("<title>Pharmacy</title><p>Product page</p>");
    }
    await rejected;
  } finally {
    await browser.close();
  }
});

test("stops challenge URL loops even when the page never becomes stable", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent("<title>Pharmacy</title><p>Loading</p>");
    const rejected = assert.rejects(waitForHumanVerification(page, true), error =>
      error instanceof HumanVerificationError && /keeps returning/.test(error.message));
    for (let cycle = 0; cycle < 4; cycle++) {
      await page.waitForTimeout(1_100);
      await page.goto(`data:text/html,<title>Just a moment...</title><p>Performing security verification ${cycle}</p>`);
    }
    await rejected;
  } finally {
    await browser.close();
  }
});

test("continues in the same browser page after manual clearance without terminal input", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent("<title>Just a moment...</title><p>Performing security verification</p>");
    await assert.rejects(waitForHumanVerification(page, false), /manual verification/);
    const waiting = waitForHumanVerification(page, true);
    await page.waitForTimeout(200);
    await page.setContent("<title>Pharmacy</title><p>Sildenafil 50mg 4 tablets £12.00</p>");
    await waiting;
    assert.match(await page.locator("body").innerText(), /Sildenafil/);
    await page.close();
    await assert.rejects(waitForHumanVerification(page, true), /browser was closed/);
  } finally {
    await browser.close();
  }
});
