import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { extractPriceSignals } from "./lib/price-signal-extraction";
import { collectRenderedPageSignals, collectRenderedPrice, pickStructuredPrice, type RenderedVariantPrice } from "./lib/product-price";
import { PrismaClient } from "../src/generated/prisma/client";
import { collectPublicWebsite } from "../src/lib/discovery/public-web";
import { collectCandidateUrls, type DetectedProductMatch } from "../src/lib/product-detection/detect-products";
import { edCategoryRootSegments, edPageMentionsIngredient, matchEdProductPath, resolveIngredientFromTerm } from "../src/lib/product-detection/ed-tokens";

import type { Ingredient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Bounds how many matched product pages get scraped per pharmacy — a broad category match
// (MEDIUM confidence) can surface several listing pages on one site; this keeps a single run
// polite and fast rather than exhaustively hitting every one of them.
const MAX_PRODUCT_PAGES_PER_PHARMACY = 3;
const strictCollectionStopPattern = /robots rules|human-verification|captcha|review (?:it|the page) manually|only public html pages|unexpected content type/i;
const humanAssist = process.argv.includes("--human") || process.env.ED_PRICE_HUMAN_ASSIST === "1";

type ScrapedProduct =
  | { candidateUrl: string; ingredient: Ingredient; matchedTokens: string[]; confidence: "HIGH" | "MEDIUM"; scrapedAt: string; latestPrice: string | null; priceSource: string | null; priceBasis: string | null; priceEvidence: string | null; deliveryPrice: string | null; priceWarning?: string; discountsFound: string[]; variants: unknown[]; renderedVariantRows: RenderedVariantPrice[]; jsonLdOffers: unknown[] }
  | { candidateUrl: string; ingredient: Ingredient; matchedTokens: string[]; confidence: "HIGH" | "MEDIUM"; scrapedAt: string; error: string };

function compareConfidence(a: DetectedProductMatch, b: DetectedProductMatch): number {
  const rank = { HIGH: 0, MEDIUM: 1 } satisfies Record<DetectedProductMatch["confidence"], number>;
  return rank[a.confidence] - rank[b.confidence];
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
    } catch (error) {
      if (!(error instanceof Error) || !strictCollectionStopPattern.test(error.message)) continue;
      try {
        const rendered = await collectRenderedPageSignals(url, [drugTerm], { humanAssist });
        if (edPageMentionsIngredient(rendered.html, ingredient)) {
          htmlCache.set(url, rendered.html);
          matches.push({ candidateUrl: url, ingredient, matchedTokens: [drugTerm.toLowerCase()], confidence: "MEDIUM" });
        }
      } catch {
        // A category-root page failing to fetch is not reported here; matched product pages report their own failures below.
      }
    }
  }
  return matches;
}

function dedupeMatches(matches: DetectedProductMatch[]): DetectedProductMatch[] {
  const byUrl = new Map<string, DetectedProductMatch>();
  for (const match of matches) {
    const existing = byUrl.get(match.candidateUrl);
    if (!existing || (existing.confidence === "MEDIUM" && match.confidence === "HIGH")) {
      byUrl.set(match.candidateUrl, match);
    }
  }
  return [...byUrl.values()].sort(compareConfidence);
}

async function collectCandidateUrlsForAudit(websiteDomain: string, drugTerm: string) {
  try {
    return { candidateUrls: await collectCandidateUrls(websiteDomain), note: undefined as string | undefined };
  } catch (error) {
    if (!(error instanceof Error) || !strictCollectionStopPattern.test(error.message)) throw error;
    const rendered = await collectRenderedPageSignals(`https://${websiteDomain}`, [drugTerm], { humanAssist });
    return {
      candidateUrls: rendered.candidateUrls,
      note: `Used patchright rendered-page fallback after strict collection stopped: ${error.message}`,
    };
  }
}

// Shared per-site flow reused for both DiscoveryCandidate leads and already-promoted Providers:
// find this drug's product page(s) on the site, then scrape each one for price/discount/variant
// signals. Everything about *which* pharmacies to check lives in main(); this only knows about
// one website at a time.
async function scrapeDrugOnSite(websiteDomain: string, ingredient: Ingredient, drugTerm: string): Promise<{ note?: string; products: ScrapedProduct[] }> {
  let candidateUrls: string[];
  let siteNote: string | undefined;
  try {
    const discovery = await collectCandidateUrlsForAudit(websiteDomain, drugTerm);
    candidateUrls = discovery.candidateUrls;
    siteNote = discovery.note;
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
    .sort(compareConfidence);

  // Some pharmacies expose the real strength/quantity matrix on a shared ED condition page even
  // when their navigation also contains weaker direct URL matches. Keep direct pages first, but add
  // confirmed category-root pages too so Medy-style tables are not dropped.
  const categoryMatches = await findCategoryPageMatches(candidateUrls, new Set(directMatches.map((match) => match.candidateUrl)), ingredient, drugTerm, htmlCache);
  const matches = dedupeMatches([...directMatches, ...categoryMatches]).slice(0, MAX_PRODUCT_PAGES_PER_PHARMACY);

  if (matches.length === 0) return { note: siteNote ?? `No ${drugTerm} product page found on this site.`, products: [] };

  const products: ScrapedProduct[] = [];
  for (const match of matches) {
    const scrapedAt = new Date().toISOString();
    try {
      let pageWarning: string | undefined;
      let renderedPricing: Awaited<ReturnType<typeof collectRenderedPrice>> | undefined;
      let html = htmlCache.get(match.candidateUrl);
      if (!html) {
        try {
          html = (await collectPublicWebsite(match.candidateUrl)).html;
        } catch (error) {
          if (!(error instanceof Error) || !strictCollectionStopPattern.test(error.message)) throw error;
          const rendered = await collectRenderedPageSignals(match.candidateUrl, match.matchedTokens, { humanAssist });
          html = rendered.html;
          renderedPricing = rendered.pricing;
          pageWarning = `Used patchright rendered-page fallback after strict collection stopped: ${error.message}`;
        }
      }
      const signals = extractPriceSignals(html);
      const structuredPrice = pickStructuredPrice(signals.jsonLdOffers, match.matchedTokens);
      let pricing = { latestPrice: structuredPrice, priceSource: structuredPrice ? "json-ld-product-offer" : null,
        priceBasis: structuredPrice ? "offer (unit unspecified)" : null, priceEvidence: null as string | null,
        deliveryPrice: null as string | null, priceWarning: pageWarning, variantRows: [] as RenderedVariantPrice[] };
      if (!structuredPrice || signals.variants.length === 0) {
        try {
          const rendered = renderedPricing ?? await collectRenderedPrice(match.candidateUrl, match.matchedTokens, { humanAssist });
          pricing = { ...pricing, ...rendered };
          if (!pricing.latestPrice) pricing.priceWarning = "No unambiguous price found in the matching product card.";
        } catch (error) {
          pricing.priceWarning = error instanceof Error ? error.message : "Rendered price collection failed.";
        }
      }
      products.push({
        candidateUrl: match.candidateUrl,
        ingredient: match.ingredient,
        matchedTokens: match.matchedTokens,
        confidence: match.confidence,
        scrapedAt,
        latestPrice: pricing.latestPrice,
        priceSource: pricing.priceSource,
        priceBasis: pricing.priceBasis,
        priceEvidence: pricing.priceEvidence,
        deliveryPrice: pricing.deliveryPrice,
        priceWarning: pricing.priceWarning,
        discountsFound: signals.discountsFound,
        variants: signals.variants,
        renderedVariantRows: pricing.variantRows,
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
  return { note: siteNote, products };
}

function countOutcomes(products: ScrapedProduct[]) {
  const failed = products.filter((product) => "error" in product).length;
  return { scraped: products.length - failed, failed };
}

async function main() {
  const drugTerm = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!drugTerm) {
    console.error("Usage: npm run discovery:ed-price-scrape -- <drug name, e.g. viagra> [--human]");
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
