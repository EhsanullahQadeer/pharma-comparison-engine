import { chromium, type Browser, type Page } from "patchright";

import { cdpUrlVariants, ensureDebugChrome } from "@/lib/browser/debug-chrome";
import { assertGoogleAiRequestLimit, readPageLinks, waitForGoogleAiCitationUrls } from "@/lib/discovery/google-ai-citations";
import { collectDiscoveryHomepage } from "@/lib/discovery/homepage-collection";
import { homepageEvidence } from "@/lib/discovery/homepage-evidence";
import type { NormalizedCandidate } from "@/types/discovery";

const AI_MODE_URL = "https://www.google.com/ai";
const GOOGLE_AI_CDP_URL = process.env.GOOGLE_AI_CDP_URL ?? "http://127.0.0.1:9222";
const GOOGLE_AI_PROFILE_DIR = process.env.GOOGLE_AI_PROFILE_DIR ?? "tmp/patchright-google-profile";
const GOOGLE_AI_BROWSER_CHANNEL = process.env.GOOGLE_AI_BROWSER_CHANNEL ?? "chrome";
const unavailablePattern = /not (?:currently )?available|unusual traffic|captcha|verify you are human|couldn.t sign you in|this browser or app may not be secure/i;
const signedOutPattern = /\bsign in\b|to continue|choose an account|use your google account/i;
const productListingPathPattern = /\/(?:products?|shop|treatments?|medicines?|medications?|collections?|erectile-dysfunction|sildenafil|tadalafil|viagra|cialis)(?:\/|$)/i;

type GoogleAiSession = {
  close: () => Promise<void>;
  page: Page;
};

let cdpBrowserPromise: Promise<Browser> | null = null;

function isClosedTargetError(error: unknown) {
  return error instanceof Error && /target page, context or browser has been closed|econnrefused|connectovercdp/i.test(error.message);
}

async function connectToGoogleAiCdp() {
  if (cdpBrowserPromise) return cdpBrowserPromise;
  const urls = cdpUrlVariants(GOOGLE_AI_CDP_URL);
  cdpBrowserPromise = (async () => {
    // Reopens the project's signed-in debug Chrome if an admin closed it, before attaching.
    const started = await ensureDebugChrome(GOOGLE_AI_CDP_URL);
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
    const startNote = started ? "" : " Chrome could not be started automatically (is Google Chrome installed? HUMAN_SCRAPE_CHROME_PATH can point to it).";
    if (lastError instanceof Error) {
      throw new Error(`Google AI Chrome debugging session is not reachable at ${urls.join(" or ")}.${startNote} Confirm AI Mode is signed in there, then rerun discovery. Last error: ${lastError.message}`);
    }
    throw new Error(`Google AI Chrome debugging session is not reachable at ${urls.join(" or ")}.${startNote} Confirm AI Mode is signed in there, then rerun discovery.`);
  })().catch(error => {
    cdpBrowserPromise = null;
    throw error;
  });
  return cdpBrowserPromise;
}

// Detaches from the debug Chrome (leaving the window open) so nothing stays attached between runs —
// sites such as DeepSeek's hCaptcha keep looping while automation is attached, so a person could
// otherwise never sign in without stopping the dev server. The next run reconnects.
export async function disconnectGoogleAiBrowser() {
  const pending = cdpBrowserPromise;
  cdpBrowserPromise = null;
  const browser = await pending?.catch(() => undefined);
  await browser?.close().catch(() => undefined);
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
  assertGoogleAiRequestLimit(body);
  if (unavailablePattern.test(body)) {
    throw new Error("Google AI Mode is unavailable or blocked in this browser. Enrichment was not completed; retry with AI Mode access.");
  }
  if (signedOutPattern.test(body)) {
    throw new Error(GOOGLE_AI_CDP_URL
      ? "Google AI Mode needs a signed-in Google account in the Chrome debugging session. Sign into the Chrome window opened with remote debugging, keep it open, then rerun discovery from the same server/session."
      : "Google AI Mode needs a signed-in browser. Start Chrome with --remote-debugging-port=9222, set GOOGLE_AI_CDP_URL=http://127.0.0.1:9222 on the process running discovery, sign into Google there, then rerun discovery.");
  }
}

export function isManualReviewCollectionStop(error: unknown) {
  return error instanceof Error && /robots rules|restricted network address|review (?:it|the page|this website) manually|too many redirects|human-verification|captcha|only public html pages/i.test(error.message);
}

export function extractGoogleAiGphcNumber(text: string): string | undefined {
  const normalized = text.replace(/\s+/g, " ");
  const labelledPatterns = [
    /(?:gphc|general pharmaceutical council|pharmacy registration(?: number)?|premises registration(?: number)?|registration number)[^\d]{0,80}(\d{7})/i,
    /(\d{7})[^\d]{0,80}(?:gphc|general pharmaceutical council|pharmacy registration|premises registration)/i,
  ];
  for (const pattern of labelledPatterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

async function googleAiBody(page: Page) {
  const body = await page.locator("body").innerText();
  return body.replace(/\s+/g, " ");
}

function googleAiDeliveryEvidence(body: string) {
  const normalized = body.replace(/\s+/g, " ");
  const snippets = normalized.match(/[^.?!]*(?:deliver|delivery|delivered|shipping|postage|courier|royal mail|online pharmacy|distance selling)[^.?!]*[.?!]?/gi) ?? [];
  return [...new Set(snippets.map(snippet => snippet.trim()).filter(Boolean))].slice(0, 8);
}

export function googleAiProductListingUrls(urls: Iterable<string>) {
  return [...new Set([...urls].filter((url) => {
    try {
      return productListingPathPattern.test(new URL(url).pathname);
    } catch {
      return false;
    }
  }))];
}

function googleAiProductListingEvidence(body: string) {
  const snippets = body.match(/[^.?!]*(?:product list|products?|treatments?|medicines?|medications?|sildenafil|tadalafil|viagra|cialis)[^.?!]*[.?!]?/gi) ?? [];
  return [...new Set(snippets.map(snippet => snippet.trim()).filter(Boolean))].slice(0, 8);
}

export async function enrichWithGoogleAi(candidate: NormalizedCandidate): Promise<NormalizedCandidate | null> {
  const { close, page } = await openGoogleAiSession();
  try {
    page.setDefaultTimeout(30_000);
    await page.goto(AI_MODE_URL, { waitUntil: "domcontentloaded" });
    await assertGoogleAiReady(page);
    const query = "For " + candidate.name + ", " + (candidate.postcode ?? "UK") + (candidate.gphcNumber ? ", GPhC " + candidate.gphcNumber : "") + ", return results only if its official website publicly lists pharmacy products or treatments. Cite the direct official product, treatment, medicine, shop, or ED listing URL and name the listed product/treatment. Also give the GPhC pharmacy registration number, phone number and delivery options. Exclude directories, consultation-only sites, prescription-request-only sites, and pharmacies without a public product listing.";
    const input = page.locator('textarea:visible, input[name="q"]:visible, [contenteditable="true"]:visible').first();
    await input.fill(query);
    await input.press("Enter");
    const citationUrls = await waitForGoogleAiCitationUrls(
      async () => {
        assertGoogleAiRequestLimit(await page.locator("body").innerText());
        return readPageLinks(page);
      },
      () => page.waitForTimeout(500),
    );
    if (!citationUrls.size) {
      // Missing citations are a candidate-level no-match, but a broken session
      // must still stop the run so staff can restore access.
      await assertGoogleAiReady(page);
      return null;
    }
    const aiBody = await googleAiBody(page);
    const productListingUrls = googleAiProductListingUrls(citationUrls);
    if (!productListingUrls.length) return null;
    const origins = new Set(productListingUrls.map(url => new URL(url).origin));
    const aiGphcNumber = candidate.gphcNumber ?? extractGoogleAiGphcNumber(aiBody);
    const enrichedCandidate = aiGphcNumber ? { ...candidate, gphcNumber: aiGphcNumber } : candidate;
    const aiDeliveryEvidence = googleAiDeliveryEvidence(aiBody);
    const aiProductEvidence = googleAiProductListingEvidence(aiBody);
    const failures: string[] = [];
    const manualReviewStops: string[] = [];
    for (const origin of [...origins].slice(0, 5)) {
      try {
        const homepage = await collectDiscoveryHomepage(origin);
        const evidence = homepageEvidence(homepage.html, enrichedCandidate);
        if (!evidence.verifiedIdentity || !evidence.deliveryEvidence.length) continue;
        return {
          ...enrichedCandidate,
          websiteDomain: new URL(homepage.finalUrl).hostname.replace(/^www\./, ""),
          rawPayload: { source: candidate.rawPayload, enrichment: {
            method: "GOOGLE_AI_MODE", query, searchUrl: page.url(), websiteUrl: homepage.finalUrl,
            gphcNumber: aiGphcNumber,
            phoneNumbers: evidence.phones, deliveryEvidence: evidence.deliveryEvidence,
            productListingUrls, productListingEvidence: aiProductEvidence,
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
      const websiteUrl = productListingUrls[0];
      return {
        ...enrichedCandidate,
        websiteDomain: new URL(websiteUrl).hostname.replace(/^www\./, ""),
        rawPayload: { source: candidate.rawPayload, enrichment: {
          method: "GOOGLE_AI_MODE",
          query,
          searchUrl: page.url(),
          websiteUrl,
          gphcNumber: aiGphcNumber,
          phoneNumbers: [],
          deliveryEvidence: aiDeliveryEvidence,
          productListingUrls,
          productListingEvidence: aiProductEvidence,
          homepageVerificationSkipped: manualReviewStops,
          checkedAt: new Date().toISOString(),
        } },
      };
    }
    return null;
  } finally { await close(); }
}
