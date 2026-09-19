import { stdout } from "node:process";

import { chromium } from "playwright";

const AI_MODE_URL = "https://www.google.com/ai";
const cdpUrl = process.env.GOOGLE_AI_CDP_URL ?? "http://127.0.0.1:9222";
const query = process.argv.slice(2).join(" ") || "Find the official pharmacy website for Pharmacy2U, LS15 8GB, GPhC 1098011. Give the official website link, phone number and delivery options. Exclude directories.";

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
  const input = page.locator('textarea:visible, input[name="q"]:visible, [contenteditable="true"]:visible').first();
  await input.fill(query);
  await input.press("Enter");
  await page.waitForTimeout(20_000);

  const links = await page.locator("a[href]").evaluateAll(elements => elements.slice(0, 80).map(element => {
    const anchor = element as HTMLAnchorElement;
    return {
      href: anchor.href,
      text: anchor.innerText.replace(/\s+/g, " ").trim().slice(0, 160),
    };
  }));

  stdout.write(`URL: ${page.url()}\n`);
  stdout.write(`Links found: ${links.length}\n`);
  stdout.write(JSON.stringify(links, null, 2));
  stdout.write("\n");

  detachFromCdpBrowser(browser);
  setTimeout(() => process.exit(0), 50);
}

main().catch(error => {
  stdout.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
