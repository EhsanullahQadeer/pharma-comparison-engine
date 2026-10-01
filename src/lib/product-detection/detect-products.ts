import { collectPublicWebsite } from "@/lib/discovery/public-web";
import { isEdCategoryPagePath, matchEdProductLinkText, matchEdProductPath, matchEdProductTitle, type EdPathMatch } from "@/lib/product-detection/ed-tokens";
import { collectFeedCandidates, type FeedCandidate } from "@/lib/product-detection/site-feeds";
import type { PageLink } from "@/types/product-detection";

export type DetectedProductMatch = EdPathMatch & { candidateUrl: string };

// The pharmacy's own site includes its subdomains (www-agnostic): e.g. oxforde-pharmacy.co.uk runs
// its shop on app.oxforde-pharmacy.co.uk.
export function isSameSite(hostname: string, siteHostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const site = siteHostname.toLowerCase().replace(/^www\./, "");
  return host === site || host.endsWith(`.${site}`);
}

// Every href (incl. <link> tags, text ""), with the text shown inside any <a> pointing at it.
export function extractSameOriginLinks(html: string, base: URL): PageLink[] {
  const texts = new Map<string, string>();
  for (const [, attributes, inner] of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attributes.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) texts.set(href, `${texts.get(href) ?? ""} ${inner.replace(/<[^>]*>/g, " ")}`);
  }
  const links: PageLink[] = [];
  for (const [, href] of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    try {
      const url = new URL(href, base);
      if (isSameSite(url.hostname, base.hostname)) links.push({ url: url.href, text: texts.get(href) ?? "" });
    } catch {
      // Malformed/relative-scheme href (mailto:, tel:, javascript:) — not a page to consider.
    }
  }
  return links;
}

// Fetches a provider's homepage and every same-domain URL any of site-feeds.ts's sitemap/product-
// feed paths expose (sitemap.xml, sitemap indexes followed one level deep, RSS/Atom/Google-
// Shopping-style product feeds, ...) through the same SSRF/robots-safe path discovery already uses.
// Tried before ever falling back to a full browser render — most sites that expose anything expose
// it here. Shared by detectEdProductMatches (URL-token + feed-title matching) and callers that need
// the raw link set for their own page-level checks (e.g. the price scraper's category-page
// fallback), which don't need each feed item's own declared title.
export async function collectCandidateUrls(websiteDomain: string): Promise<string[]> {
  const [homepageLinks, feedCandidates] = await Promise.all([
    collectHomepageLinks(websiteDomain),
    collectFeedCandidates(websiteDomain),
  ]);
  return [...new Set([...homepageLinks, ...feedCandidates.map((candidate) => candidate.url)])];
}

// Same-domain links on the provider's homepage alone (plain request) — for callers that already
// hold the feed/sitemap URLs and only reach for the homepage when those found nothing.
export async function collectHomepageLinks(websiteDomain: string): Promise<string[]> {
  const homepage = await collectPublicWebsite(`https://${websiteDomain}`);
  return extractSameOriginLinks(homepage.html, new URL(homepage.finalUrl)).map((link) => link.url);
}

// Matches ED ingredient tokens against same-domain link paths (never page body text, per
// docs/implementation-plan.md §6), then — for pages the path didn't settle — a product-feed item's
// own declared title, then the product name shown on a link to it (see matchEdProductTitle /
// matchEdProductLinkText for why those two are exempt from the body-text ban). Shared by the
// plain-request pass below and the browser pass (detect-products-in-browser.ts).
export function matchEdProductLinks(links: PageLink[], feedCandidates: FeedCandidate[]): DetectedProductMatch[] {
  const matches = new Map<string, DetectedProductMatch>();
  for (const url of new Set([...links.map((link) => link.url), ...feedCandidates.map((candidate) => candidate.url)])) {
    const match = matchEdProductPath(new URL(url).pathname);
    if (match) matches.set(url, { candidateUrl: url, ...match });
  }
  for (const candidate of feedCandidates) {
    if (matches.has(candidate.url) || !candidate.title) continue;
    const match = matchEdProductTitle(candidate.title);
    if (match) matches.set(candidate.url, { candidateUrl: candidate.url, ...match });
  }
  for (const link of links) {
    if (matches.has(link.url)) continue;
    const match = matchEdProductLinkText(link.text, new URL(link.url).pathname);
    if (match) matches.set(link.url, { candidateUrl: link.url, ...match });
  }
  return [...matches.values()];
}

// ED condition pages opened per pharmacy in the plain pass.
const MAX_CATEGORY_PAGES = 3;

// Links on the pharmacy's ED condition pages (found on its homepage or in its sitemap) — where
// product pages missing from the sitemap are linked, e.g. Zava's /uk/erectile-dysfunction-treatment.html
// → /uk/viagra.html behind a country-picker homepage. A page that can't be read is skipped.
async function collectEdCategoryLinks(urls: string[]): Promise<PageLink[]> {
  const categoryUrls = [...new Set(urls)].filter((url) => isEdCategoryPagePath(new URL(url).pathname)).slice(0, MAX_CATEGORY_PAGES);
  const pages = await Promise.all(categoryUrls.map((url) => collectPublicWebsite(url).catch(() => undefined)));
  return pages.flatMap((page) => (page ? extractSameOriginLinks(page.html, new URL(page.finalUrl)) : []));
}

// Plain-request pass over the homepage, every recognized sitemap/product feed and the ED condition
// pages those link to. Returns candidates for staff review; nothing here is written to the database.
export async function detectEdProductMatches(websiteDomain: string): Promise<DetectedProductMatch[]> {
  const [homepage, feedCandidates] = await Promise.all([
    collectPublicWebsite(`https://${websiteDomain}`),
    collectFeedCandidates(websiteDomain),
  ]);
  const homepageLinks = extractSameOriginLinks(homepage.html, new URL(homepage.finalUrl));
  const categoryLinks = await collectEdCategoryLinks([...homepageLinks.map((link) => link.url), ...feedCandidates.map((candidate) => candidate.url)]);
  return matchEdProductLinks([...homepageLinks, ...categoryLinks], feedCandidates);
}
