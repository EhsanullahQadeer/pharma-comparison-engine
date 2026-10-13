import type { Ingredient } from "@/generated/prisma/client";
import { collectPublicWebsite } from "@/lib/discovery/public-web";
import { FINAL_REFUSAL, normalizePublicUrl, robotsAllows } from "@/lib/discovery/public-web-policy";
import { openHumanBrowser, waitForHumanVerification } from "@/lib/price-collection/human-browser";
import { readRobotsInBrowser } from "@/lib/price-collection/robots-in-browser";
import { clickThroughEdProductCards, isEdCategoryLink, isShopLink, openEdCategoryByClick, passPostcodePrompt, readRenderedLinks } from "@/lib/product-detection/browser-shop-pages";
import { detectEdProductMatches, findEdCategoryUrls, matchEdProductLinks, type DetectedProductMatch } from "@/lib/product-detection/detect-products";
import { offeredOptionsInHtml } from "@/lib/product-detection/page-variants";
import { collectFeedCandidates, type FeedCandidate } from "@/lib/product-detection/site-feeds";
import type { OfferedOption, PageLink, ProductDetectionMethod } from "@/types/product-detection";

import type { Page } from "patchright";

// Page budget per pharmacy: shop entry pages tried when the homepage links no ED category, ED
// category listings read, and product cards clicked per listing.
const MAX_SHOP_PAGES = 2;
const MAX_CATEGORY_PAGES = 3;
const MAX_CARDS_PER_LISTING = 20;
// Product pages whose strength/pack options are read in the browser per run.
const MAX_OPTION_PAGES = 15;
// How long a script-drawn product page gets to show its heading before it is read as it stands.
const RENDER_WAIT_MS = 8_000;

type DetectionOptions = { postcode?: string };

// One pharmacy's pages in the visible debug Chrome (see openHumanBrowser), where a person completes
// any security check; nothing here tries to pass one. Each subdomain's robots.txt is read once and
// pages it refuses are skipped.
function siteReader(page: Page, siteHostname: string, postcode?: string) {
  const robotsByOrigin = new Map<string, string>();
  async function allowed(url: string) {
    const { origin, pathname, search } = new URL(url);
    if (!robotsByOrigin.has(origin)) robotsByOrigin.set(origin, await readRobotsInBrowser(page, origin, true));
    return robotsAllows(robotsByOrigin.get(origin) ?? "", pathname + search);
  }
  async function open(url: string): Promise<PageLink[] | undefined> {
    if (!await allowed(url)) return undefined;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForHumanVerification(page, true);
    await passPostcodePrompt(page, postcode);
    return readRenderedLinks(page, siteHostname);
  }
  // An ED listing: its links, plus wherever its script-driven product cards lead.
  async function readListing(): Promise<PageLink[]> {
    const links = await readRenderedLinks(page, siteHostname);
    return [...links, ...await clickThroughEdProductCards(page, MAX_CARDS_PER_LISTING, postcode)];
  }
  return { open, readListing };
}

function uniqueUrls(links: PageLink[], keep: (link: PageLink) => boolean, limit: number) {
  return [...new Set(links.filter(keep).map((link) => link.url))].slice(0, limit);
}

async function detectEdProductMatchesInBrowser(websiteDomain: string, feedCandidates: FeedCandidate[], { postcode }: DetectionOptions): Promise<DetectedProductMatch[]> {
  const homepage = normalizePublicUrl(`https://${websiteDomain}`);
  const browser = await openHumanBrowser();
  try {
    const reader = siteReader(browser.page, homepage.hostname, postcode);
    const links = await reader.open(homepage.href);
    if (!links) throw new Error("Collection stopped: robots rules (read in the browser) do not permit this page.");

    // Homepage → shop entry → ED category, when the homepage doesn't link a category directly.
    // A shop whose category list is clickable labels (no links) is opened by clicking the name.
    if (!links.some(isEdCategoryLink)) {
      for (const shopUrl of uniqueUrls(links, isShopLink, MAX_SHOP_PAGES)) {
        const shopLinks = await reader.open(shopUrl);
        if (!shopLinks) continue;
        links.push(...shopLinks);
        if (shopLinks.some(isEdCategoryLink)) break;
        if (await openEdCategoryByClick(browser.page)) {
          links.push(...await reader.readListing());
          break;
        }
      }
    }

    for (const categoryUrl of uniqueUrls(links, isEdCategoryLink, MAX_CATEGORY_PAGES)) {
      if (!await reader.open(categoryUrl)) continue;
      links.push(...await reader.readListing());
    }
    return matchEdProductLinks(links, feedCandidates);
  } finally {
    await browser.close();
  }
}

// The strength/pack options on product pages a plain request couldn't reach (a security check in
// front of every page, e.g. Oxford Online Pharmacy), read from each page as loaded in the Chrome
// window. Same rules as the rest of this file: robots.txt is honoured and a person clears any
// check. A page that fails to load is skipped; the caller leaves it for staff to assign by hand.
export async function readOfferedOptionsInBrowser(pages: { url: string; ingredient: Ingredient }[], websiteDomain: string, { postcode }: DetectionOptions = {}): Promise<Map<string, OfferedOption[]>> {
  const options = new Map<string, OfferedOption[]>();
  if (pages.length === 0) return options;
  const browser = await openHumanBrowser();
  try {
    const reader = siteReader(browser.page, normalizePublicUrl(`https://${websiteDomain}`).hostname, postcode);
    for (const { url, ingredient } of pages.slice(0, MAX_OPTION_PAGES)) {
      try {
        if (!await reader.open(url)) continue;
        // A page drawn by its own scripts has no product on it yet; its heading arrives with it.
        await browser.page.locator("h1").first().waitFor({ timeout: RENDER_WAIT_MS }).catch(() => undefined);
        options.set(url, offeredOptionsInHtml(await browser.page.content(), browser.page.url(), ingredient));
      } catch {
        // This page didn't load; the others may.
      }
    }
  } finally {
    await browser.close();
  }
  return options;
}

const ingredientTokens: Record<Ingredient, string> = { SILDENAFIL: "sildenafil", TADALAFIL: "tadalafil" };

// A pharmacy with no product pages of its own may sell everything from its one ED page (Phlo
// Clinic's /male-health/erectile-dysfunction lists each treatment's strengths, packs and prices).
// Such a page counts as a product page for an ingredient only when it really shows priced options
// for it — an ordinary category page that just links onwards never does.
async function detectCombinedEdPages(websiteDomain: string, feedCandidates: FeedCandidate[]): Promise<DetectedProductMatch[]> {
  const matches: DetectedProductMatch[] = [];
  for (const url of await findEdCategoryUrls(websiteDomain, feedCandidates)) {
    try {
      const page = await collectPublicWebsite(url);
      for (const ingredient of Object.keys(ingredientTokens) as Ingredient[]) {
        if (offeredOptionsInHtml(page.html, page.finalUrl, ingredient).length === 0) continue;
        matches.push({ candidateUrl: page.finalUrl, ingredient, matchedTokens: [ingredientTokens[ingredient]], confidence: "MEDIUM" });
      }
    } catch {
      // An unreadable page isn't evidence either way; the browser pass may still find products.
    }
  }
  return matches;
}

// Plain request first; the Chrome window only when that was blocked or found no product pages
// (links built by JavaScript, a shop behind a postcode prompt, or a site that turns away visitors
// from outside the UK). The site's feeds are read once and shared by both passes — a second sweep
// right before the Chrome window opens is what got that window's own connection reset.
export async function detectEdProductMatchesWithBrowserFallback(websiteDomain: string, options: DetectionOptions = {}): Promise<{ matches: DetectedProductMatch[]; method: ProductDetectionMethod }> {
  const feedCandidates = await collectFeedCandidates(websiteDomain);
  let plainError: unknown;
  try {
    const matches = await detectEdProductMatches(websiteDomain, feedCandidates);
    if (matches.length > 0) return { matches, method: "http" };
    const combined = await detectCombinedEdPages(websiteDomain, feedCandidates);
    if (combined.length > 0) return { matches: combined, method: "http" };
  } catch (error) {
    if (error instanceof Error && FINAL_REFUSAL.test(error.message)) throw error;
    plainError = error;
  }
  try {
    return { matches: await detectEdProductMatchesInBrowser(websiteDomain, feedCandidates, options), method: "browser" };
  } catch (error) {
    const plain = plainError instanceof Error ? `The plain request failed (${plainError.message})` : "The plain request found no product pages";
    throw new Error(`${plain}, and the Chrome window check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
