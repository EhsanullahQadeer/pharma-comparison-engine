import { chromium, type Browser, type Page } from "playwright";

import { googleAiCitationUrls } from "@/lib/discovery/google-ai-citations";
import { isManualReviewCollectionStop } from "@/lib/discovery/google-ai-enrichment";
import { collectDiscoveryHomepage } from "@/lib/discovery/homepage-collection";
import { homepageEvidence } from "@/lib/discovery/homepage-evidence";
import type { NormalizedCandidate } from "@/types/discovery";

const DEEPSEEK_CHAT_URL = process.env.DEEPSEEK_CHAT_URL ?? "https://chat.deepseek.com/";
const DEEPSEEK_CDP_URL = process.env.DEEPSEEK_CDP_URL ?? process.env.GOOGLE_AI_CDP_URL ?? "http://127.0.0.1:9222";
const unavailablePattern = /sign in|log in|verify you are human|captcha|unusual traffic|service unavailable/i;
const productListingPathPattern = /\/(?:products?|shop|treatments?|medicines?|medications?|collections?|erectile-dysfunction|sildenafil|tadalafil|viagra|cialis)(?:\/|$)/i;

let cdpBrowserPromise: Promise<Browser> | null = null;

function cdpUrls() {
  const urls = [DEEPSEEK_CDP_URL];
  if (DEEPSEEK_CDP_URL.includes("127.0.0.1")) urls.push(DEEPSEEK_CDP_URL.replace("127.0.0.1", "localhost"));
  if (DEEPSEEK_CDP_URL.includes("localhost")) urls.push(DEEPSEEK_CDP_URL.replace("localhost", "127.0.0.1"));
  return [...new Set(urls)];
}

async function openDeepSeekPage() {
  if (!cdpBrowserPromise) {
    cdpBrowserPromise = (async () => {
      let lastError: unknown;
      for (const url of cdpUrls()) {
        try {
          const browser = await chromium.connectOverCDP(url);
          browser.on("disconnected", () => { cdpBrowserPromise = null; });
          return browser;
        } catch (error) { lastError = error; }
      }
      const detail = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
      throw new Error(`DeepSeek Chrome debugging session is not reachable at ${cdpUrls().join(" or ")}. Sign into DeepSeek in a normal Chrome session with remote debugging, then retry.${detail}`);
    })().catch(error => { cdpBrowserPromise = null; throw error; });
  }
  const browser = await cdpBrowserPromise;
  return (browser.contexts()[0] ?? await browser.newContext()).newPage();
}

function productListingUrls(urls: Iterable<string>) {
  return [...new Set([...urls].filter((url) => {
    try { return productListingPathPattern.test(new URL(url).pathname); } catch { return false; }
  }))];
}

async function enableWebSearch(page: Page) {
  // DeepSeek currently renders the toggle as a focusable div, rather than a native button.
  // Match its visible label then use the enclosing aria-pressed control.
  const button = page.getByText(/^(?:Search|Web Search|联网搜索)$/i).first().locator("..");
  if (!await button.isVisible().catch(() => false)) {
    throw new Error("DeepSeek Web Search control was not found. Open a new DeepSeek chat in the connected Chrome session, enable Web Search, then retry.");
  }
  if (await button.getAttribute("aria-pressed") !== "true") await button.click();
}

async function waitForCompletedCitationUrls(page: Page) {
  let previousBody = "";
  let stableReads = 0;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const links = await page.locator("a[href]").evaluateAll(elements => elements.map(element => (element as HTMLAnchorElement).href));
    const urls = googleAiCitationUrls(links);
    const body = await page.locator("body").innerText();
    stableReads = body === previousBody ? stableReads + 1 : 0;
    previousBody = body;
    // DeepSeek exposes source links while it is still streaming. Five unchanged reads ensure we
    // do not close the temporary tab before staff can see a completed response.
    if (urls.size && stableReads >= 5) return urls;
    await page.waitForTimeout(1_000);
  }
  return googleAiCitationUrls(await page.locator("a[href]").evaluateAll(elements => elements.map(element => (element as HTMLAnchorElement).href)));
}

export async function enrichWithDeepSeekWeb(candidate: NormalizedCandidate): Promise<NormalizedCandidate | null> {
  const page = await openDeepSeekPage();
  try {
    page.setDefaultTimeout(30_000);
    await page.goto(DEEPSEEK_CHAT_URL, { waitUntil: "domcontentloaded" });
    if (unavailablePattern.test(await page.locator("body").innerText())) throw new Error("DeepSeek must be signed in in the connected Chrome session before discovery can run.");
    await enableWebSearch(page);
    const query = `Search the web for ${candidate.name}, ${candidate.postcode ?? "UK"}${candidate.gphcNumber ? `, GPhC ${candidate.gphcNumber}` : ""}. Return results only when the pharmacy's official website publicly lists pharmacy products or treatments. Cite the direct official product, treatment, medicine, shop, or ED listing URL and state the listed product/treatment, GPhC pharmacy registration number, phone number, and delivery options. Exclude directories, consultation-only sites, prescription-request-only sites, and pharmacies without a public product listing.`;
    const input = page.locator("textarea:visible, [contenteditable=true]:visible").last();
    await input.fill(query);
    await input.press("Enter");
    const listings = productListingUrls(await waitForCompletedCitationUrls(page));
    if (!listings.length) return null;
    const origin = new URL(listings[0]).origin;
    try {
      const homepage = await collectDiscoveryHomepage(origin);
      const evidence = homepageEvidence(homepage.html, candidate);
      if (!evidence.verifiedIdentity || !evidence.deliveryEvidence.length) return null;
      return { ...candidate, websiteDomain: new URL(homepage.finalUrl).hostname.replace(/^www\./, ""), rawPayload: { source: candidate.rawPayload, enrichment: {
        method: "DEEPSEEK_WEB_SEARCH", query, searchUrl: page.url(), websiteUrl: homepage.finalUrl, phoneNumbers: evidence.phones,
        deliveryEvidence: evidence.deliveryEvidence, productListingUrls: listings, checkedAt: new Date().toISOString(),
      } } };
    } catch (error) {
      if (isManualReviewCollectionStop(error)) return null;
      throw error;
    }
  } finally { await page.close().catch(() => undefined); }
}
