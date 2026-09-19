import { stdout } from "node:process";

import { chromium } from "playwright";

const AI_MODE_URL = "https://www.google.com/ai";
const cdpUrl = process.env.GOOGLE_AI_CDP_URL ?? "http://127.0.0.1:9222";
const unavailablePattern = /not (?:currently )?available|unusual traffic|captcha|verify you are human|couldn.t sign you in|this browser or app may not be secure/i;
const signedOutPattern = /\bsign in\b|to continue|choose an account|use your google account/i;

type BrowserWithConnection = {
  _connection?: {
    close?: () => void;
  };
};

function detachFromCdpBrowser(browser: unknown) {
  (browser as BrowserWithConnection)._connection?.close?.();
}

async function main() {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0] ?? await browser.newContext();
  const page = context.pages()[0] ?? await context.newPage();

  await page.goto(AI_MODE_URL, { waitUntil: "domcontentloaded" });
  const body = await page.locator("body").innerText();
  const unavailable = unavailablePattern.test(body);
  const signedOut = signedOutPattern.test(body);

  if (signedOut) stdout.write("Google AI Mode is open, but this Chrome session is not signed into Google.\n");
  else stdout.write(`${unavailable ? "Google AI Mode is still unavailable." : "Google AI Mode page opened through the signed-in Chrome session."}\n`);
  stdout.write(`Current URL: ${page.url()}\n`);
  detachFromCdpBrowser(browser);
  setTimeout(() => process.exit(0), 50);
}

main().catch(error => {
  stdout.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
