import { join } from "node:path";

import { chromium, type Browser, type Page } from "playwright";

export class HumanVerificationError extends Error {}

let humanBrowserInUse = false;
const repeatedChallengeMessage = "The website keeps returning to Cloudflare verification. Scraping stopped without retrying or reloading. Open the site in your regular browser to check access; automated collection may not be supported by this website.";
const HUMAN_SCRAPE_CDP_URL = process.env.HUMAN_SCRAPE_CDP_URL ?? process.env.GOOGLE_AI_CDP_URL ?? "http://127.0.0.1:9222";
const HUMAN_SCRAPE_BROWSER_CHANNEL = process.env.HUMAN_SCRAPE_BROWSER_CHANNEL ?? process.env.GOOGLE_AI_BROWSER_CHANNEL ?? "chrome";

let cdpBrowserPromise: Promise<Browser | undefined> | null = null;

export function isVerificationPage(text: string) {
  return /verify you are human|checking your browser|performing security verification|verifies you are not a bot|just a moment|captcha|recaptcha|hcaptcha/i.test(text);
}

export async function waitForHumanVerification(page: Page, humanAssist: boolean) {
  const deadline = Date.now() + (humanAssist ? 5 * 60_000 : 15_000);
  let clearReads = 0;
  let previousUrl = page.url();
  let wasChallenge = false;
  let challengeReturns = 0;
  let challengeUrlChanges = 0;
  while (Date.now() < deadline) {
    if (page.isClosed()) throw new HumanVerificationError("Verification browser was closed. Retry human-assisted scraping.");
    const text = await page.locator("body").innerText();
    const challenge = isVerificationPage(`${await page.title()} ${text}`);
    const currentUrl = page.url();
    if (humanAssist && challenge && currentUrl !== previousUrl) challengeUrlChanges++;
    if (challenge && !wasChallenge && clearReads > 0) challengeReturns++;
    if (currentUrl !== previousUrl) clearReads = 0;
    previousUrl = currentUrl;
    wasChallenge = challenge;
    if (humanAssist && (challengeReturns >= 3 || challengeUrlChanges >= 4)) throw new HumanVerificationError(repeatedChallengeMessage);
    if (challenge && !humanAssist) throw new Error("Rendered page requires manual verification.");
    if (!challenge && text.trim()) {
      clearReads++;
      if (clearReads >= (humanAssist ? 6 : 2)) return;
    } else {
      clearReads = 0;
    }
    await page.waitForTimeout(1_000);
  }
  throw new HumanVerificationError(humanAssist
    ? "Verification was not completed within five minutes. Retry human-assisted scraping."
    : "The product page did not finish loading. Retry human-assisted scraping.");
}

function humanScrapeCdpUrls() {
  const urls = [HUMAN_SCRAPE_CDP_URL];
  if (HUMAN_SCRAPE_CDP_URL.includes("127.0.0.1")) urls.push(HUMAN_SCRAPE_CDP_URL.replace("127.0.0.1", "localhost"));
  if (HUMAN_SCRAPE_CDP_URL.includes("localhost")) urls.push(HUMAN_SCRAPE_CDP_URL.replace("localhost", "127.0.0.1"));
  return [...new Set(urls)];
}

async function isCdpReachable(cdpUrl: string) {
  try {
    const response = await fetch(new URL("/json/version", cdpUrl));
    return response.ok;
  } catch {
    return false;
  }
}

async function connectToHumanScrapeCdp() {
  if (cdpBrowserPromise) {
    const browser = await cdpBrowserPromise;
    if (!browser || !browser.isConnected()) cdpBrowserPromise = null;
    else return browser;
  }
  cdpBrowserPromise = (async () => {
    for (const cdpUrl of humanScrapeCdpUrls()) {
      if (!(await isCdpReachable(cdpUrl))) continue;
      try {
        const browser = await chromium.connectOverCDP(cdpUrl);
        browser.on("disconnected", () => {
          cdpBrowserPromise = null;
        });
        return browser;
      } catch {
        cdpBrowserPromise = null;
      }
    }
    return undefined;
  })().catch(error => {
    cdpBrowserPromise = null;
    throw error;
  });
  const browser = await cdpBrowserPromise;
  if (!browser) cdpBrowserPromise = null;
  return browser;
}

export async function openHumanBrowser(options: { requireCdp?: boolean } = {}) {
  if (humanBrowserInUse) throw new HumanVerificationError("Another human scrape is running. Finish or close that browser before starting another.");
  humanBrowserInUse = true;
  try {
    const cdpBrowser = await connectToHumanScrapeCdp();
    if (cdpBrowser) {
      const context = cdpBrowser.contexts()[0] ?? await cdpBrowser.newContext();
      const page = await context.newPage();
      return {
        page,
        close: async () => {
          try { await page.close().catch(() => undefined); } finally { humanBrowserInUse = false; }
        },
      };
    }

    if (options.requireCdp) {
      throw new HumanVerificationError("Your Chrome debugging session is not reachable. Keep Chrome open with remote debugging at http://127.0.0.1:9222, then retry human-assisted scraping.");
    }

    const context = await chromium.launchPersistentContext(join(process.cwd(), "tmp", "price-collection-human-browser"), {
      channel: HUMAN_SCRAPE_BROWSER_CHANNEL,
      headless: false,
      viewport: null,
    });
    context.on("close", () => { humanBrowserInUse = false; });
    const page = context.pages()[0] ?? await context.newPage();
    return { page, close: async () => {
      try { await context.close(); } finally { humanBrowserInUse = false; }
    } };
  } catch (error) {
    humanBrowserInUse = false;
    throw error;
  }
}
