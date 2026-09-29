import { collectPublicResourceText } from "@/lib/discovery/public-web";

// Candidate feed/sitemap paths to check before ever falling back to a full-browser (patchright)
// crawl — tried in parallel, fast, and silently skipped when a path 404s or isn't recognizable XML
// (most won't exist on any given site; this is a cheap sweep, not a guarantee). Ordered roughly by
// likely usefulness: sitemap family first (most sites that expose anything expose this), then
// merchant/product feeds (highest-signal when present — an explicit product catalog with titles),
// then general content feeds, then the long tail that's realistic to check but rarely present on a
// pharmacy site (kept anyway since checking is cheap and a miss just 404s quickly).
export const FEED_PATHS = [
  "/sitemap.xml",
  "/sitemap-index.xml",
  "/sitemap_index.xml",
  "/news-sitemap.xml",
  "/image-sitemap.xml",
  "/video-sitemap.xml",
  "/product-feed.xml",
  "/gmc-feed.xml",
  "/facebook-catalog.xml",
  "/bing-merchant-feed.xml",
  "/affiliate-feed.xml",
  "/inventory-feed.xml",
  "/price-feed.xml",
  "/rss.xml",
  "/atom.xml",
  "/podcast.xml",
] as const;

// A merchant-feed item's own declared price (Google Merchant / Meta catalog / Bing g:price, or a
// plain <price>), GBP only — anything quoted in another currency is dropped, never converted.
export type FeedPrice = {
  itemPricePence: number;
  deliveryFeePence?: number;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
};

export type FeedCandidate = { url: string; title?: string; price?: FeedPrice };

// "Same domain" is judged www.-agnostic — base is built from the raw input domain, but a feed's own
// <loc>/<link> entries reflect wherever the site's canonical redirect actually lands (bare ->
// "www." or the reverse), which is still the same logical site.
function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./i, "");
}

function absoluteSameOrigin(value: string, base: URL): URL | undefined {
  try {
    const url = new URL(value, base);
    return normalizeHost(url.hostname) === normalizeHost(base.hostname) ? url : undefined;
  } catch {
    return undefined;
  }
}

function extractTagBlocks(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))].map((match) => match[1]);
}

function cleanText(value: string): string {
  return value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]*>/g, "").trim();
}

function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

// Sitemap/sitemap-index family: <urlset><url><loc>...</loc></url></urlset> or
// <sitemapindex><sitemap><loc>...</loc></sitemap></sitemapindex> — <loc> means the same thing
// either way (a URL), the caller decides whether to treat it as a page or a nested sitemap to
// follow based on isSitemapIndex.
function extractLocs(xml: string, base: URL): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)]
    .map((match) => absoluteSameOrigin(match[1], base))
    .filter((url): url is URL => Boolean(url))
    .map((url) => url.href);
}

function tagText(block: string, tags: string[]): { attrs: string; text: string } | undefined {
  for (const tag of tags) {
    const match = block.match(new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (match) return { attrs: match[1] ?? "", text: cleanText(match[2]) };
  }
  return undefined;
}

// "12.99 GBP", "£12.99", "12.99" with currency="GBP" — GBP only; a bare number with no currency
// marker at all is not trusted, since a feed's default currency isn't declared anywhere we read.
function parseGbpPence(value: { attrs: string; text: string } | undefined): number | undefined {
  if (!value) return undefined;
  const isGbp = /\bGBP\b|£/i.test(value.text) || /currency\s*=\s*["']GBP["']/i.test(value.attrs);
  const amount = value.text.replace(/,/g, "").match(/\d+(?:\.\d{1,2})?/)?.[0];
  if (!isGbp || !amount) return undefined;
  return Math.round(Number(amount) * 100);
}

function isSaleActive(entry: string): boolean {
  const range = tagText(entry, ["g:sale_price_effective_date", "sale_price_effective_date"])?.text;
  if (!range) return true;
  const [from, to] = range.split("/").map((part) => Date.parse(part));
  const now = Date.now();
  return !(Number.isFinite(from) && now < from) && !(Number.isFinite(to) && now > to);
}

const feedAvailabilityMap: Record<string, FeedPrice["availability"]> = {
  in_stock: "IN_STOCK",
  instock: "IN_STOCK",
  out_of_stock: "OUT_OF_STOCK",
  outofstock: "OUT_OF_STOCK",
};

function extractFeedPrice(entry: string): FeedPrice | undefined {
  const shippingBlock = entry.match(/<g:shipping>([\s\S]*?)<\/g:shipping>/i);
  // The item's own price tags are read with the shipping block removed — it nests a <g:price> of
  // its own that would otherwise be mistaken for the product price.
  const itemBlock = shippingBlock ? entry.replace(shippingBlock[0], "") : entry;
  const salePence = isSaleActive(itemBlock) ? parseGbpPence(tagText(itemBlock, ["g:sale_price", "sale_price"])) : undefined;
  const itemPricePence = salePence ?? parseGbpPence(tagText(itemBlock, ["g:price", "price"]));
  if (itemPricePence === undefined) return undefined;
  const rawAvailability = tagText(itemBlock, ["g:availability", "availability"])?.text.toLowerCase().replace(/^https?:\/\/schema\.org\//, "").replace(/\s+/g, "_") ?? "";
  return {
    itemPricePence,
    deliveryFeePence: shippingBlock ? parseGbpPence(tagText(shippingBlock[1], ["g:price", "price"])) : undefined,
    availability: feedAvailabilityMap[rawAvailability] ?? "UNKNOWN",
  };
}

// RSS 2.0 (<rss><channel><item>) and Google Shopping-style product feeds (same shape, items also
// carry a g: namespace — <g:link>, <g:title>) / Atom (<feed><entry><link href="...">). A feed
// item's own declared title (and merchant-feed price, when it carries one) is returned alongside
// its URL, distinct from a page's body text.
function extractFeedItems(xml: string, base: URL): FeedCandidate[] {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const items: FeedCandidate[] = [];
  for (const entry of extractTagBlocks(xml, isAtom ? "entry" : "item")) {
    const rawLink = isAtom
      ? entry.match(/<link[^>]*\shref=["']([^"']+)["']/i)?.[1]
      : (entry.match(/<g:link>([\s\S]*?)<\/g:link>/i)?.[1] ?? entry.match(/<link>([\s\S]*?)<\/link>/i)?.[1]);
    const url = rawLink ? absoluteSameOrigin(cleanText(rawLink), base) : undefined;
    if (!url) continue;
    const rawTitle = entry.match(/<g:title>([\s\S]*?)<\/g:title>/i)?.[1] ?? entry.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    items.push({ url: url.href, title: rawTitle ? cleanText(rawTitle) : undefined, price: extractFeedPrice(entry) });
  }
  return items;
}

async function fetchFeedText(url: string): Promise<string | undefined> {
  try {
    return (await collectPublicResourceText(url, /xml|rss|atom|text\/plain/i)).text;
  } catch {
    return undefined;
  }
}

// Parses a feed/sitemap response already in hand (used by both the plain-fetch path below and the
// patchright-page-based human-assist path, which fetches the same URLs through the browser
// instead) into either same-domain page URLs (sitemap-style) or the nested sitemap URLs to follow
// one level deeper (sitemap-index), plus any product-feed items with their own titles.
export function parseFeedText(text: string, base: URL): { locs: string[]; items: FeedCandidate[]; isIndex: boolean } {
  if (isSitemapIndex(text)) return { locs: extractLocs(text, base), items: [], isIndex: true };
  return { locs: extractLocs(text, base), items: extractFeedItems(text, base), isIndex: false };
}

// Fetches every candidate feed path in parallel, parses whichever ones exist and are recognizable
// XML, follows one bounded level of sitemap-index nesting (e.g. Shopify's sitemap.xml often just
// lists sitemap_products_1.xml, sitemap_pages_1.xml, ...), and returns a deduped list of same-domain
// URLs — with a product title alongside, when the feed that found it carries one. Never throws — an
// absent or unparseable feed is silently skipped, since most of these paths won't exist on any
// given site; this is a wide, cheap sweep before ever escalating to a full browser render.
export async function collectFeedCandidates(websiteDomain: string): Promise<FeedCandidate[]> {
  const base = new URL(`https://${websiteDomain}`);
  const fetched = await Promise.all(FEED_PATHS.map(async (path) => {
    const text = await fetchFeedText(new URL(path, base).href);
    return text ? parseFeedText(text, base) : undefined;
  }));

  const candidates = new Map<string, FeedCandidate>();
  const nestedSitemapUrls = new Set<string>();
  for (const feed of fetched) {
    if (!feed) continue;
    if (feed.isIndex) {
      for (const loc of feed.locs) nestedSitemapUrls.add(loc);
      continue;
    }
    for (const loc of feed.locs) if (!candidates.has(loc)) candidates.set(loc, { url: loc });
    for (const item of feed.items) {
      const existing = candidates.get(item.url);
      candidates.set(item.url, { url: item.url, title: item.title ?? existing?.title, price: item.price ?? existing?.price });
    }
  }

  const nested = await Promise.all([...nestedSitemapUrls].slice(0, 10).map(fetchFeedText));
  for (const text of nested) {
    if (!text) continue;
    for (const loc of extractLocs(text, base)) if (!candidates.has(loc)) candidates.set(loc, { url: loc });
  }

  return [...candidates.values()];
}
