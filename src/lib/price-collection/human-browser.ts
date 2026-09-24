import { chromium, type Browser, type Page } from "playwright";

export class HumanVerificationError extends Error {}

let humanBrowserInUse = false;
const repeatedChallengeMessage = "The website keeps returning to Cloudflare verification. Scraping stopped without retrying or reloading. Open the site in your regular browser to check access; automated collection may not be supported by this website.";
const HUMAN_SCRAPE_CDP_URL = process.env.HUMAN_SCRAPE_CDP_URL ?? process.env.GOOGLE_AI_CDP_URL ?? "http://127.0.0.1:9222";
const HUMAN_SCRAPE_PROFILE_DIR = process.env.HUMAN_SCRAPE_PROFILE_DIR ?? process.env.GOOGLE_AI_PROFILE_DIR ?? "tmp/google-ai-cdp-profile";
const HUMAN_SCRAPE_BROWSER_CHANNEL = process.env.HUMAN_SCRAPE_BROWSER_CHANNEL ?? process.env.GOOGLE_AI_BROWSER_CHANNEL ?? "chrome";
// Derived from HUMAN_SCRAPE_CDP_URL (not a separate hardcoded constant) so a custom port in that
// URL is actually the port Chrome gets launched with — launching on the default 9222 while checking
// reachability against a configured non-default port would never find what it just started.
const DEBUG_PORT = new URL(HUMAN_SCRAPE_CDP_URL).port || "9222";

let cdpBrowserPromise: Promise<Browser | undefined> | null = null;
let launchingDebugChrome = false;

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

// Starts a real, visible Chrome window with remote debugging exposed at the same port
// connectToHumanScrapeCdp already looks for — the same mechanism scripts/dev-google-ai.ts uses to
// bootstrap one by hand. Self-heals the gap where an admin closes that window and every later
// scrape/check just fails until someone manually reruns `npm run dev:google-ai` from a terminal:
// once this launches, the new window is reachable exactly like a human-opened one, so this same
// call (and every later call, including the rest of a batch run) finds and reuses it over CDP
// instead of opening and fully closing a fresh window per candidate. Uses the same persistent,
// already-signed-in profile the Google AI flow uses (HUMAN_SCRAPE_PROFILE_DIR/GOOGLE_AI_PROFILE_DIR)
// rather than a throwaway one, so a login done once carries over.
async function launchDebugChrome(): Promise<Browser | undefined> {
  await chromium.launchPersistentContext(HUMAN_SCRAPE_PROFILE_DIR, {
    args: ["--remote-debugging-address=127.0.0.1", `--remote-debugging-port=${DEBUG_PORT}`],
    channel: HUMAN_SCRAPE_BROWSER_CHANNEL,
    headless: false,
    viewport: null,
  });
  for (const cdpUrl of humanScrapeCdpUrls()) {
    if (!(await isCdpReachable(cdpUrl))) continue;
    const browser = await chromium.connectOverCDP(cdpUrl);
    browser.on("disconnected", () => {
      cdpBrowserPromise = null;
    });
    return browser;
  }
  return undefined;
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
    // No reachable session anywhere — start one instead of failing and forcing a manual restart.
    // launchingDebugChrome guards against two concurrent callers (e.g. two batch workers) racing to
    // launch their own Chrome at the same time; the loser just finds nothing reachable yet and its
    // own caller (openHumanBrowser) surfaces a clear "still starting" error to retry.
    if (launchingDebugChrome) return undefined;
    launchingDebugChrome = true;
    try {
      return await launchDebugChrome();
    } finally {
      launchingDebugChrome = false;
    }
  })().catch(error => {
    cdpBrowserPromise = null;
    throw error;
  });
  const browser = await cdpBrowserPromise;
  if (!browser) cdpBrowserPromise = null;
  return browser;
}

export async function openHumanBrowser() {
  if (humanBrowserInUse) throw new HumanVerificationError("Another human scrape is running. Finish or close that browser before starting another.");
  humanBrowserInUse = true;
  try {
    const cdpBrowser = await connectToHumanScrapeCdp();
    if (!cdpBrowser) {
      throw new HumanVerificationError("Could not open or reach a Chrome debugging session yet — it may still be starting. Wait a moment and retry human-assisted scraping.");
    }
    const context = cdpBrowser.contexts()[0] ?? await cdpBrowser.newContext();
    const page = await context.newPage();
    return {
      page,
      close: async () => {
        try { await page.close().catch(() => undefined); } finally { humanBrowserInUse = false; }
      },
    };
  } catch (error) {
    humanBrowserInUse = false;
    throw error;
  }
}
