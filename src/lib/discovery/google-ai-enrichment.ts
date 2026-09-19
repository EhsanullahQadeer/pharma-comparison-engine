import { chromium, type Browser, type Page } from "playwright";

import { homepageEvidence } from "@/lib/discovery/homepage-evidence";
import { collectPublicWebsite } from "@/lib/discovery/public-web";
import type { NormalizedCandidate } from "@/types/discovery";

const AI_MODE_URL = "https://www.google.com/ai";
const GOOGLE_AI_CDP_URL = process.env.GOOGLE_AI_CDP_URL ?? "http://127.0.0.1:9222";
const GOOGLE_AI_PROFILE_DIR = process.env.GOOGLE_AI_PROFILE_DIR ?? "tmp/playwright-google-profile";
const GOOGLE_AI_BROWSER_CHANNEL = process.env.GOOGLE_AI_BROWSER_CHANNEL ?? "chrome";
const excludedHosts = /(^|\.)(google\.[a-z.]+|googleusercontent\.com|gstatic\.com|nhs\.uk|pharmacyregulation\.org|cqc\.org\.uk|facebook\.com|instagram\.com|yell\.com|yelp\.[a-z.]+|trustpilot\.com)$/i;
const unavailablePattern = /not (?:currently )?available|unusual traffic|captcha|verify you are human|couldn.t sign you in|this browser or app may not be secure/i;
const signedOutPattern = /\bsign in\b|to continue|choose an account|use your google account/i;

type GoogleAiSession = {
  close: () => Promise<void>;
  page: Page;
};

let cdpBrowserPromise: Promise<Browser> | null = null;

function isClosedTargetError(error: unknown) {
  return error instanceof Error && /target page, context or browser has been closed|econnrefused|connectovercdp/i.test(error.message);
}

function googleAiCdpUrls() {
  const urls = [GOOGLE_AI_CDP_URL];
  if (GOOGLE_AI_CDP_URL.includes("127.0.0.1")) urls.push(GOOGLE_AI_CDP_URL.replace("127.0.0.1", "localhost"));
  if (GOOGLE_AI_CDP_URL.includes("localhost")) urls.push(GOOGLE_AI_CDP_URL.replace("localhost", "127.0.0.1"));
  return [...new Set(urls)];
}

async function connectToGoogleAiCdp() {
  if (cdpBrowserPromise) return cdpBrowserPromise;
  const urls = googleAiCdpUrls();
  cdpBrowserPromise = (async () => {
    let lastError: unknown;
    for (const cdpUrl of urls) {
      for (const delay of [0, 500, 1_500]) {
        if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
        try {
          const browser = await chromium.connectOverCDP(cdpUrl);
          browser.on("disconnected", () => {
            cdpBrowserPromise = null;
          });
          return browser;
        } catch (error) {
          lastError = error;
          if (!isClosedTargetError(error)) throw error;
        }
      }
    }
    if (lastError instanceof Error) {
      throw new Error(`Google AI Chrome debugging session is not reachable at ${urls.join(" or ")}. Reopen Chrome with --remote-debugging-port=9222, keep it open, confirm AI Mode is signed in, then rerun discovery. Last error: ${lastError.message}`);
    }
    throw new Error(`Google AI Chrome debugging session is not reachable at ${urls.join(" or ")}. Reopen Chrome with --remote-debugging-port=9222, keep it open, confirm AI Mode is signed in, then rerun discovery.`);
  })().catch(error => {
    cdpBrowserPromise = null;
    throw error;
  });
  return cdpBrowserPromise;
}

async function openGoogleAiSession(): Promise<GoogleAiSession> {
  if (GOOGLE_AI_CDP_URL) {
    const browser = await connectToGoogleAiCdp();
    const context = browser.contexts()[0] ?? await browser.newContext();
    const page = await context.newPage();
    return {
      close: async () => {
        await page.close().catch(() => undefined);
      },
      page,
    };
  }

  const context = await chromium.launchPersistentContext(GOOGLE_AI_PROFILE_DIR, {
    channel: GOOGLE_AI_BROWSER_CHANNEL,
    headless: false,
  });

  return {
    close: () => context.close(),
    page: await context.newPage(),
  };
}

async function assertGoogleAiReady(page: Page) {
  const body = await page.locator("body").innerText();
  if (unavailablePattern.test(body)) {
    throw new Error("Google AI Mode is unavailable or blocked in this browser. Enrichment was not completed; retry with AI Mode access.");
  }
  if (signedOutPattern.test(body)) {
    throw new Error(GOOGLE_AI_CDP_URL
      ? "Google AI Mode needs a signed-in Google account in the Chrome debugging session. Sign into the Chrome window opened with remote debugging, keep it open, then rerun discovery from the same server/session."
      : "Google AI Mode needs a signed-in browser. Start Chrome with --remote-debugging-port=9222, set GOOGLE_AI_CDP_URL=http://127.0.0.1:9222 on the process running discovery, sign into Google there, then rerun discovery.");
  }
}

async function waitForGoogleAiCitations(page: Page) {
  try {
    await page.waitForFunction(() => [...document.querySelectorAll("a[href]")]
      .some(element => element.getAttribute("href")?.startsWith("https://") && !element.getAttribute("href")?.includes("google.")), undefined, { timeout: 30_000 });
  } catch (error) {
    await assertGoogleAiReady(page);
    throw new Error(`Google AI Mode did not return usable website citations within 30 seconds. ${error instanceof Error ? error.message : String(error)}`);
  }
}

function normalizeGoogleAiLink(link: string): string | null {
  try {
    const url = new URL(link);
    const redirected = url.hostname.includes("google.") ? url.searchParams.get("q") ?? url.searchParams.get("url") : null;
    if (redirected?.startsWith("https://")) return redirected;
    if (url.protocol === "https:") return url.href;
  } catch { /* Ignore invalid links. */ }
  return null;
}

function isManualReviewCollectionStop(error: unknown) {
  return error instanceof Error && /robots rules|review (?:it|the page) manually|human-verification|captcha|only public html pages/i.test(error.message);
}

async function googleAiDeliveryEvidence(page: Page) {
  const body = await page.locator("body").innerText();
  const normalized = body.replace(/\s+/g, " ");
  const snippets = normalized.match(/[^.?!]*(?:deliver|delivery|delivered|shipping|postage|courier|royal mail|online pharmacy|distance selling)[^.?!]*[.?!]?/gi) ?? [];
  return [...new Set(snippets.map(snippet => snippet.trim()).filter(Boolean))].slice(0, 8);
}

export async function enrichWithGoogleAi(candidate: NormalizedCandidate): Promise<NormalizedCandidate | null> {
  const { close, page } = await openGoogleAiSession();
  try {
    page.setDefaultTimeout(30_000);
    await page.goto(AI_MODE_URL, { waitUntil: "domcontentloaded" });
    await assertGoogleAiReady(page);
    const query = `Find the official pharmacy website for ${candidate.name}, ${candidate.postcode ?? "UK"}, GPhC ${candidate.gphcNumber ?? "unknown"}. Give the official website link, phone number and delivery options. Exclude directories.`;
    const input = page.locator('textarea:visible, input[name="q"]:visible, [contenteditable="true"]:visible').first();
    await input.fill(query);
    await input.press("Enter");
    await waitForGoogleAiCitations(page);
    const links = await page.locator("a[href]").evaluateAll(elements => elements.map(element => (element as HTMLAnchorElement).href));
    const origins = new Set<string>();
    for (const link of links) {
      try {
        const normalizedLink = normalizeGoogleAiLink(link);
        if (!normalizedLink) continue;
        const url = new URL(normalizedLink);
        if (url.protocol === "https:" && !excludedHosts.test(url.hostname)) origins.add(url.origin);
      } catch { /* Ignore non-web citations. */ }
    }
    if (!origins.size) throw new Error("Google AI Mode returned no usable website citations; enrichment could not be verified.");
    const aiDeliveryEvidence = await googleAiDeliveryEvidence(page);
    const failures: string[] = [];
    const manualReviewStops: string[] = [];
    for (const origin of [...origins].slice(0, 5)) {
      try {
        const homepage = await collectPublicWebsite(origin);
        const evidence = homepageEvidence(homepage.html, candidate);
        if (!evidence.verifiedIdentity || !evidence.deliveryEvidence.length) continue;
        return {
          ...candidate,
          websiteDomain: new URL(homepage.finalUrl).hostname.replace(/^www\./, ""),
          rawPayload: { source: candidate.rawPayload, enrichment: {
            method: "GOOGLE_AI_MODE", query, searchUrl: page.url(), websiteUrl: homepage.finalUrl,
            phoneNumbers: evidence.phones, deliveryEvidence: evidence.deliveryEvidence,
            checkedAt: new Date().toISOString(),
          } },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isManualReviewCollectionStop(error)) {
          manualReviewStops.push(`${origin}: ${message}`);
          continue;
        }
        failures.push(`${origin}: ${message}`);
      }
    }
    if (failures.length) throw new Error(`Homepage verification incomplete: ${failures.join("; ")}`);
    if (aiDeliveryEvidence.length) {
      const websiteUrl = [...origins][0];
      return {
        ...candidate,
        websiteDomain: new URL(websiteUrl).hostname.replace(/^www\./, ""),
        rawPayload: { source: candidate.rawPayload, enrichment: {
          method: "GOOGLE_AI_MODE",
          query,
          searchUrl: page.url(),
          websiteUrl,
          phoneNumbers: [],
          deliveryEvidence: aiDeliveryEvidence,
          homepageVerificationSkipped: manualReviewStops,
          checkedAt: new Date().toISOString(),
        } },
      };
    }
    return null;
  } finally { await close(); }
}
