import { join } from "node:path";

import { chromium, type Browser, type Page } from "patchright";

import { chromeExecutable, DEBUG_CHROME_CDP_URL, DEBUG_CHROME_PROFILE_DIR, ensureDebugChrome } from "@/lib/browser/debug-chrome";

export class HumanVerificationError extends Error {}

let humanBrowserInUse = false;
const repeatedChallengeMessage = "The website keeps returning to Cloudflare verification. Scraping stopped without retrying or reloading. Open the site in your regular browser to check access; automated collection may not be supported by this website.";
const HUMAN_SCRAPE_CDP_URL = DEBUG_CHROME_CDP_URL;
const HUMAN_SCRAPE_BROWSER_CHANNEL = process.env.HUMAN_SCRAPE_BROWSER_CHANNEL ?? process.env.GOOGLE_AI_BROWSER_CHANNEL ?? "chrome";

let cdpBrowserPromise: Promise<Browser | undefined> | null = null;

export function isVerificationPage(text: string) {
  return /verify you are human|checking your browser|performing security verification|verifies you are not a bot|just a moment|captcha|recaptcha|hcaptcha/i.test(text);
}

// onWaiting reports elapsed seconds roughly every 10s while a humanAssist wait is still going —
// the only step in a scrape that can silently run for up to five minutes, so it's the one place
// worth a periodic heartbeat rather than just a single before/after message.
export async function waitForHumanVerification(page: Page, humanAssist: boolean, onWaiting?: (elapsedSeconds: number) => void) {
  const start = Date.now();
  const deadline = start + (humanAssist ? 5 * 60_000 : 15_000);
  let clearReads = 0;
  let previousUrl = page.url();
  let wasChallenge = false;
  let challengeReturns = 0;
  let challengeUrlChanges = 0;
  let lastHeartbeatAt = start;
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
    if (humanAssist && onWaiting && Date.now() - lastHeartbeatAt >= 10_000) {
      lastHeartbeatAt = Date.now();
      onWaiting(Math.round((Date.now() - start) / 1000));
    }
    await page.waitForTimeout(1_000);
  }
  throw new HumanVerificationError(humanAssist
    ? "Verification was not completed within five minutes. Retry human-assisted scraping."
    : "The product page did not finish loading. Retry human-assisted scraping.");
}

// Attaches (patchright over CDP) to the project's debug Chrome, starting it first if an admin closed
// it (see ensureDebugChrome) — so a scrape never fails just because the window was shut. If Chrome
// isn't installed, falls back to a patchright-launched persistent context on the same profile.
async function connectToHumanScrapeCdp(): Promise<Browser | undefined> {
  if (cdpBrowserPromise) {
    const browser = await cdpBrowserPromise;
    if (browser?.isConnected()) return browser;
    cdpBrowserPromise = null;
  }
  cdpBrowserPromise = (async () => {
    let cdpUrl = await ensureDebugChrome(HUMAN_SCRAPE_CDP_URL);
    if (!cdpUrl && !chromeExecutable()) {
      await chromium.launchPersistentContext(DEBUG_CHROME_PROFILE_DIR, {
        args: ["--remote-debugging-address=127.0.0.1", `--remote-debugging-port=${new URL(HUMAN_SCRAPE_CDP_URL).port || "9222"}`],
        channel: HUMAN_SCRAPE_BROWSER_CHANNEL,
        headless: false,
        viewport: null,
      });
      cdpUrl = await ensureDebugChrome(HUMAN_SCRAPE_CDP_URL);
    }
    if (!cdpUrl) return undefined;
    const browser = await chromium.connectOverCDP(cdpUrl);
    browser.on("disconnected", () => {
      cdpBrowserPromise = null;
    });
    return browser;
  })().catch(error => {
    cdpBrowserPromise = null;
    throw error;
  });
  const browser = await cdpBrowserPromise;
  if (!browser) cdpBrowserPromise = null;
  return browser;
}

export async function openHumanBrowser(options: { requireCdp?: boolean; preferCdp?: boolean } = {}) {
  if (humanBrowserInUse) throw new HumanVerificationError("Another human scrape is running. Finish or close that browser before starting another.");
  humanBrowserInUse = true;
  try {
    const cdpBrowser = options.preferCdp === false ? undefined : await connectToHumanScrapeCdp();
    if (cdpBrowser) {
      const context = cdpBrowser.contexts()[0] ?? await cdpBrowser.newContext();
      const page = await context.newPage();
      return {
        page,
        // Closes this scrape's tab and detaches from Chrome (the window stays open), so nothing is
        // left attached for a person signing into Google/DeepSeek there later.
        close: async () => {
          try {
            await page.close().catch(() => undefined);
            cdpBrowserPromise = null;
            await cdpBrowser.close().catch(() => undefined);
          } finally { humanBrowserInUse = false; }
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
      args: ["--start-maximized"],
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
