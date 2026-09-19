import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { extractPriceSignals, type PriceSignalExtraction } from "./lib/price-signal-extraction";
import type { Ingredient } from "../src/generated/prisma/client";
import { PrismaClient } from "../src/generated/prisma/client";
import { collectPublicWebsite } from "../src/lib/discovery/public-web";
import { collectCandidateUrls, type DetectedProductMatch } from "../src/lib/product-detection/detect-products";
import { edCategoryRootSegments, edPageMentionsIngredient, matchEdProductPath, resolveIngredientFromTerm } from "../src/lib/product-detection/ed-tokens";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Bounds how many matched product pages get scraped per pharmacy — a broad category match
// (MEDIUM confidence) can surface several listing pages on one site; this keeps a single run
// polite and fast rather than exhaustively hitting every one of them.
const MAX_PRODUCT_PAGES_PER_PHARMACY = 3;

type ScrapedProduct =
  | { candidateUrl: string; ingredient: Ingredient; matchedTokens: string[]; confidence: "HIGH" | "MEDIUM"; scrapedAt: string; latestPrice: string | null; discountsFound: string[]; variants: unknown[]; jsonLdOffers: unknown[] }
  | { candidateUrl: string; ingredient: Ingredient; matchedTokens: string[]; confidence: "HIGH" | "MEDIUM"; scrapedAt: string; error: string };

// A page's JSON-LD Offer price (when present) is the site's own structured price data — far more
// reliable than any regex match, so it's always preferred. Otherwise, only trust a "£X" figure
// found close to one of the matched drug tokens in the page's own text — never just the first
// price found anywhere on the page, which can be an unrelated delivery fee, a different product's
// price on a shared multi-drug page, or other promo text. Returns null (never a guess) when
// neither source ties a price to this specific drug — e.g. a site that renders its real price via
// client-side JavaScript, so it's simply absent from the static HTML this script fetches.
function pickLatestPrice(html: string, signals: PriceSignalExtraction, matchedTokens: string[]): string | null {
  for (const offer of signals.jsonLdOffers) {
    if (!offer || typeof offer !== "object" || !("price" in offer)) continue;
    const price = Number((offer as { price: unknown }).price);
    if (!Number.isNaN(price)) return `£${price.toFixed(2)}`;
  }

  const lowerHtml = html.toLowerCase();
  for (const token of matchedTokens) {
    const tokenIndex = lowerHtml.indexOf(token.toLowerCase());
    if (tokenIndex === -1) continue;
    const window = html.slice(Math.max(0, tokenIndex - 400), Math.min(html.length, tokenIndex + 400));
    const price = window.match(/£\s?\d{1,4}(?:\.\d{2})?/);
    if (price) return price[0];
  }
  return null;
}

// Some sites put every drug on one combined "/erectile-dysfunction" page instead of a dedicated
// URL per drug (e.g. medy.uk) — matchEdProductPath alone never surfaces those since there's no
// per-drug slug to match. This checks each such category-root URL's own content for the requested
// ingredient and folds any hit into the same match shape the URL-based pass produces, caching the
// fetched HTML so the scoring loop below doesn't fetch it a second time.
async function findCategoryPageMatches(candidateUrls: string[], alreadyMatched: Set<string>, ingredient: Ingredient, drugTerm: string, htmlCache: Map<string, string>): Promise<DetectedProductMatch[]> {
  const rootCandidates = candidateUrls.filter((url) => {
    if (alreadyMatched.has(url)) return false;
    const segments = new URL(url).pathname.split("/").filter(Boolean).map((segment) => segment.toLowerCase());
    return segments.length === 1 && edCategoryRootSegments.has(segments[0]);
  });

  const matches: DetectedProductMatch[] = [];
  for (const url of rootCandidates) {
    try {
      const { html } = await collectPublicWebsite(url);
      if (edPageMentionsIngredient(html, ingredient)) {
        htmlCache.set(url, html);
        matches.push({ candidateUrl: url, ingredient, matchedTokens: [drugTerm.toLowerCase()], confidence: "MEDIUM" });
      }
    } catch {
      // A category-root page failing to fetch isn't reported as an error here — the URL-based pass
      // already surfaces real per-page fetch failures for the matches it actually found.
    }
  }
  return matches;
}

// Shared per-site flow reused for both DiscoveryCandidate leads and already-promoted Providers:
// find this drug's product page(s) on the site, then scrape each one for price/discount/variant
// signals. Everything about *which* pharmacies to check lives in main(); this only knows about
// one website at a time.
async function scrapeDrugOnSite(websiteDomain: string, ingredient: Ingredient, drugTerm: string): Promise<{ note?: string; products: ScrapedProduct[] }> {
  let candidateUrls: string[];
  try {
    candidateUrls = await collectCandidateUrls(websiteDomain);
  } catch (error) {
    return { note: error instanceof Error ? error.message : "Could not inspect this website.", products: [] };
  }

  const urlMatches: DetectedProductMatch[] = [];
  for (const url of candidateUrls) {
    const match = matchEdProductPath(new URL(url).pathname);
    if (match) urlMatches.push({ candidateUrl: url, ...match });
  }

  const htmlCache = new Map<string, string>();
  const directMatches = urlMatches
    .filter((match) => match.ingredient === ingredient)
    .sort((a, b) => (a.confidence === b.confidence ? 0 : a.confidence === "HIGH" ? -1 : 1));

  // The category-page fallback only runs when the URL-based pass found nothing dedicated to this
  // drug — a site with a real per-drug page (higher-confidence, and its price is tied to that one
  // product) shouldn't also get a shakier extra guess from a shared page that just happens to
  // mention the drug's name somewhere (e.g. a nav menu), which can attribute an unrelated price.
  const matches = directMatches.length > 0
    ? directMatches.slice(0, MAX_PRODUCT_PAGES_PER_PHARMACY)
    : (await findCategoryPageMatches(candidateUrls, new Set(urlMatches.map((match) => match.candidateUrl)), ingredient, drugTerm, htmlCache)).slice(0, MAX_PRODUCT_PAGES_PER_PHARMACY);

  if (matches.length === 0) return { note: `No ${drugTerm} product page found on this site.`, products: [] };

  const products: ScrapedProduct[] = [];
  for (const match of matches) {
    const scrapedAt = new Date().toISOString();
    try {
      const html = htmlCache.get(match.candidateUrl) ?? (await collectPublicWebsite(match.candidateUrl)).html;
      const signals = extractPriceSignals(html);
      products.push({
        candidateUrl: match.candidateUrl,
        ingredient: match.ingredient,
        matchedTokens: match.matchedTokens,
        confidence: match.confidence,
        scrapedAt,
        latestPrice: pickLatestPrice(html, signals, match.matchedTokens),
        discountsFound: signals.discountsFound,
        variants: signals.variants,
        jsonLdOffers: signals.jsonLdOffers,
      });
    } catch (error) {
      products.push({
        candidateUrl: match.candidateUrl,
        ingredient: match.ingredient,
        matchedTokens: match.matchedTokens,
        confidence: match.confidence,
        scrapedAt,
        error: error instanceof Error ? error.message : "Unknown scraping error",
      });
    }
  }
  return { products };
}

function countOutcomes(products: ScrapedProduct[]) {
  const failed = products.filter((product) => "error" in product).length;
  return { scraped: products.length - failed, failed };
}

async function main() {
  const drugTerm = process.argv[2];
  if (!drugTerm) {
    console.error("Usage: npm run discovery:ed-price-scrape -- <drug name, e.g. viagra>");
    process.exitCode = 1;
    return;
  }

  const ingredient = resolveIngredientFromTerm(drugTerm);
  if (!ingredient) {
    console.error(`"${drugTerm}" is not a recognized ED medicine (try "viagra", "sildenafil", "cialis", or "tadalafil").`);
    process.exitCode = 1;
    return;
  }

  const [candidates, providers] = await Promise.all([
    prisma.discoveryCandidate.findMany({
      where: { websiteDomain: { not: null }, status: { not: "REJECTED" } },
      select: { id: true, sourceRecordId: true, name: true, postcode: true, websiteDomain: true, status: true },
    }),
    prisma.provider.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: { id: true, legalName: true, tradingName: true, websiteDomain: true, status: true },
    }),
  ]);

  let pagesScraped = 0;
  let pagesFailed = 0;

  const discoveryCandidateRecords = [];
  for (const candidate of candidates) {
    console.log(`Checking discovery candidate: ${candidate.name} (${candidate.websiteDomain})...`);
    const { note, products } = await scrapeDrugOnSite(candidate.websiteDomain!, ingredient, drugTerm);
    const outcome = countOutcomes(products);
    pagesScraped += outcome.scraped;
    pagesFailed += outcome.failed;
    discoveryCandidateRecords.push({
      candidateId: candidate.id,
      sourceRecordId: candidate.sourceRecordId,
      name: candidate.name,
      postcode: candidate.postcode,
      websiteDomain: candidate.websiteDomain,
      status: candidate.status,
      note,
      products,
    });
  }

  const providerRecords = [];
  for (const provider of providers) {
    console.log(`Checking provider: ${provider.tradingName} (${provider.websiteDomain})...`);
    const { note, products } = await scrapeDrugOnSite(provider.websiteDomain, ingredient, drugTerm);
    const outcome = countOutcomes(products);
    pagesScraped += outcome.scraped;
    pagesFailed += outcome.failed;
    providerRecords.push({
      providerId: provider.id,
      legalName: provider.legalName,
      tradingName: provider.tradingName,
      websiteDomain: provider.websiteDomain,
      status: provider.status,
      note,
      products,
    });
  }

  const output = {
    drug: drugTerm,
    ingredient,
    generatedAt: new Date().toISOString(),
    discoveryCandidates: discoveryCandidateRecords,
    providers: providerRecords,
  };

  const runDir = join(process.cwd(), "tmp", "ed-price-scrape", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(runDir, { recursive: true });
  const outPath = join(runDir, `${drugTerm.toLowerCase()}.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  const pharmaciesWithMatch = [...discoveryCandidateRecords, ...providerRecords].filter((record) => record.products.length > 0).length;
  console.log(`Pharmacies considered: ${candidates.length} discovery candidates + ${providers.length} providers`);
  console.log(`Pharmacies with a ${drugTerm} product page found: ${pharmaciesWithMatch}`);
  console.log(`Product pages scraped: ${pagesScraped} ok, ${pagesFailed} failed`);
  console.log(`Results -> ${outPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
