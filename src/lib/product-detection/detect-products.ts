import { collectPublicResourceText, collectPublicWebsite } from "@/lib/discovery/public-web";
import { matchEdProductPath, type EdPathMatch } from "@/lib/product-detection/ed-tokens";

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

function extractSitemapLocs(xml: string, base: URL): string[] {
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1]);
  const urls: string[] = [];
  for (const loc of locs) {
    try {
      const url = new URL(loc);
      if (url.hostname === base.hostname) urls.push(url.href);
    } catch {
      // Malformed <loc> entry — skip it.
    }
  }
  return urls;
}

// Fetches a provider's homepage (and, best-effort, its sitemap.xml) through the same SSRF/robots-
// safe path discovery already uses, and returns every same-domain URL found either way. Shared by
// detectEdProductMatches (URL-token matching) and callers that need the raw link set for their own
// page-level checks (e.g. the price scraper's category-page fallback).
export async function collectCandidateUrls(websiteDomain: string): Promise<string[]> {
  const homepage = await collectPublicWebsite(`https://${websiteDomain}`);
  const base = new URL(homepage.finalUrl);
  const candidateUrls = new Set(extractSameOriginLinks(homepage.html, base));

  try {
    const sitemap = await collectPublicResourceText(new URL("/sitemap.xml", base).href, /xml|text\/plain/i);
    for (const url of extractSitemapLocs(sitemap.text, base)) candidateUrls.add(url);
  } catch {
    // No sitemap, or it's blocked/disallowed — homepage links alone are still a valid signal.
  }

  return [...candidateUrls];
}

// Matches ED ingredient tokens against same-domain link paths only — never page body text, per
// docs/implementation-plan.md §6. Returns candidates for staff review; nothing here is written to
// the database.
export async function detectEdProductMatches(websiteDomain: string): Promise<DetectedProductMatch[]> {
  const candidateUrls = await collectCandidateUrls(websiteDomain);

  const matches = new Map<string, DetectedProductMatch>();
  for (const candidateUrl of candidateUrls) {
    const match = matchEdProductPath(new URL(candidateUrl).pathname);
    if (match) matches.set(candidateUrl, { candidateUrl, ...match });
  }
  return [...matches.values()];
}
