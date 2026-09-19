import { stdout } from "node:process";

import { chromium } from "playwright";

const AI_MODE_URL = "https://www.google.com/ai";
const cdpUrl = process.env.GOOGLE_AI_CDP_URL ?? "http://127.0.0.1:9222";

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
  const inputs = await page.locator('textarea:visible, input[name="q"]:visible, [contenteditable="true"]:visible').count();

  stdout.write(`URL: ${page.url()}\n`);
  stdout.write(`Visible query inputs: ${inputs}\n`);
  stdout.write("Page text preview:\n");
  stdout.write(body.replace(/\s+/g, " ").slice(0, 1000));
  stdout.write("\n");

  detachFromCdpBrowser(browser);
  setTimeout(() => process.exit(0), 50);
}

main().catch(error => {
  stdout.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
