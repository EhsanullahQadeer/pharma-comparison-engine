import { collectPublicWebsite } from "@/lib/discovery/public-web";
import { matchEdProductPath, matchEdProductTitle, type EdPathMatch } from "@/lib/product-detection/ed-tokens";
import { collectFeedCandidates, type FeedCandidate } from "@/lib/product-detection/site-feeds";

export type DetectedProductMatch = EdPathMatch & { candidateUrl: string };

function extractSameOriginLinks(html: string, base: URL): string[] {
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
  const urls: string[] = [];
  for (const href of hrefs) {
    try {
      const url = new URL(href, base);
      if (url.hostname === base.hostname) urls.push(url.href);
    } catch {
      // Malformed/relative-scheme href (mailto:, tel:, javascript:) — not a page to consider.
    }
  }
  return urls;
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
  return extractSameOriginLinks(homepage.html, new URL(homepage.finalUrl));
}

// Matches ED ingredient tokens against same-domain link paths (never page body text, per
// docs/implementation-plan.md §6) found via the homepage or any recognized sitemap/product feed —
// plus, distinctly, a product-feed item's own declared title when one is available (see
// matchEdProductTitle's own comment for why that's exempt from the body-text ban: it's the site's
// own catalog system naming what a URL sells, not an incidental mention). Returns candidates for
// staff review; nothing here is written to the database.
export async function detectEdProductMatches(websiteDomain: string): Promise<DetectedProductMatch[]> {
  const [homepage, feedCandidates] = await Promise.all([
    collectPublicWebsite(`https://${websiteDomain}`),
    collectFeedCandidates(websiteDomain),
  ]);
  const base = new URL(homepage.finalUrl);
  const links = extractSameOriginLinks(homepage.html, base);

  const matches = new Map<string, DetectedProductMatch>();
  for (const url of new Set([...links, ...feedCandidates.map((candidate: FeedCandidate) => candidate.url)])) {
    const match = matchEdProductPath(new URL(url).pathname);
    if (match) matches.set(url, { candidateUrl: url, ...match });
  }
  for (const candidate of feedCandidates) {
    if (matches.has(candidate.url) || !candidate.title) continue;
    const match = matchEdProductTitle(candidate.title);
    if (match) matches.set(candidate.url, { candidateUrl: candidate.url, ...match });
  }
  return [...matches.values()];
}
