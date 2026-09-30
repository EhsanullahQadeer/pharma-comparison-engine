import { normalizePublicUrl, robotsAllows } from "@/lib/discovery/public-web-policy";
import { openHumanBrowser, waitForHumanVerification } from "@/lib/price-collection/human-browser";
import { readRobotsInBrowser } from "@/lib/price-collection/robots-in-browser";
import { clickThroughEdProductCards, isEdCategoryLink, isShopLink, openEdCategoryByClick, passPostcodePrompt, readRenderedLinks } from "@/lib/product-detection/browser-shop-pages";
import { detectEdProductMatches, matchEdProductLinks, type DetectedProductMatch } from "@/lib/product-detection/detect-products";
import { collectFeedCandidates } from "@/lib/product-detection/site-feeds";
import type { PageLink, ProductDetectionMethod } from "@/types/product-detection";

import type { Page } from "patchright";

// Page budget per pharmacy: shop entry pages tried when the homepage links no ED category, ED
// category listings read, and product cards clicked per listing.
const MAX_SHOP_PAGES = 2;
const MAX_CATEGORY_PAGES = 3;
const MAX_CARDS_PER_LISTING = 20;

// Refusals the browser must not try to get around: the site's own robots rules, or an address
// that isn't on the public internet. Anything else (403, timeout, security check, geo block, no
// products in the raw HTML) is worth a look in the browser.
const finalRefusalPattern = /robots rules[^.]*do not permit|restricted network address/i;

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

async function detectEdProductMatchesInBrowser(websiteDomain: string, { postcode }: DetectionOptions): Promise<DetectedProductMatch[]> {
  const homepage = normalizePublicUrl(`https://${websiteDomain}`);
  const feedCandidates = await collectFeedCandidates(websiteDomain);
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

// Plain request first; the Chrome window only when that was blocked or found no product pages
// (links built by JavaScript, a shop behind a postcode prompt, or a site that turns away visitors
// from outside the UK).
export async function detectEdProductMatchesWithBrowserFallback(websiteDomain: string, options: DetectionOptions = {}): Promise<{ matches: DetectedProductMatch[]; method: ProductDetectionMethod }> {
  let plainError: unknown;
  try {
    const matches = await detectEdProductMatches(websiteDomain);
    if (matches.length > 0) return { matches, method: "http" };
  } catch (error) {
    if (error instanceof Error && finalRefusalPattern.test(error.message)) throw error;
    plainError = error;
  }
  try {
    return { matches: await detectEdProductMatchesInBrowser(websiteDomain, options), method: "browser" };
  } catch (error) {
    const plain = plainError instanceof Error ? `The plain request failed (${plainError.message})` : "The plain request found no product pages";
    throw new Error(`${plain}, and the Chrome window check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
