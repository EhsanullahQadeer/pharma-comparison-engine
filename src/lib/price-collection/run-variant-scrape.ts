import type { Ingredient } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { normalizePublicUrl } from "@/lib/discovery/public-web-policy";
import { resolveScrapedDelivery } from "@/lib/price-collection/delivery-policy";
import { pickFeedVariantPrice } from "@/lib/price-collection/feed-price";
import { HumanVerificationError, openHumanBrowser, waitForHumanVerification } from "@/lib/price-collection/human-browser";
import { impossiblePriceReason } from "@/lib/price-collection/price-sanity";
import { assertRobotsAllowInBrowser } from "@/lib/price-collection/robots-in-browser";
import { scrapeProductPrice, type ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { isGenericFormulation, variantTokens, type VariantSpec } from "@/lib/price-collection/variant-label";
import { prisma } from "@/lib/prisma";
import { collectHomepageLinks } from "@/lib/product-detection/detect-products";
import { isEdCategoryRootPath, matchEdProductPath } from "@/lib/product-detection/ed-tokens";
import { collectFeedCandidates, type FeedCandidate } from "@/lib/product-detection/site-feeds";

import type { Page } from "patchright";

// The orchestration behind ProductVariantPriceActions' single "Scrape prices" button.
// Lives outside the "use server" actions file (which may only export async functions) so both the
// plain server action (scrapePricesForVariant, no live feedback) and the SSE route handler
// (app/api/product-variants/[id]/scrape-stream) can call the exact same logic — one place for the
// loop, no risk of the two callers drifting apart.
//
// Per pharmacy, the cheapest source that can settle the exact strength + pack wins:
// 1. a price declared in the pharmacy's own merchant/product feed (plain HTTP),
// 2. product-page URLs from its sitemaps/feeds, homepage links only when those found none,
// 3. that page's own JSON-LD price data (plain HTTP),
// 4. a background (headless) browser — only when 1–3 are blocked or find nothing,
// 5. the visible Chrome window — only for a pharmacy whose pages show a security check to 1–4.
//    It opens on first need, is reused for later blocked pharmacies in the same run, and a person
//    completes the check there; nothing here tries to pass one. Robots refusals never escalate.
// A pharmacy with no confirmed match first retries the page its last saved price came from.

export type VariantScrapeResult = { attempted: number; scraped: number; failed: number };
export type ScrapeProgress = (message: string) => void;

const noopProgress: ScrapeProgress = () => {};

// A security check (Cloudflare/CAPTCHA) seen by the automatic attempt — the one failure that the
// visible Chrome window can resolve. Robots refusals are deliberately excluded.
function isSecurityCheck(error: unknown) {
  return error instanceof Error
    && !(error instanceof HumanVerificationError)
    && !/robots rules/i.test(error.message)
    && /manual verification|human-verification|captcha|verify you are human|checking your browser/i.test(error.message);
}

function needsVerification(error: unknown) {
  return error instanceof HumanVerificationError || isSecurityCheck(error);
}

// Robots refusals never escalate to the browser; other plain-request blocks (403, CAPTCHA
// markers) do once a visible-browser page is supplied, where a person can clear the check.
async function collectProviderHomepageLinks(websiteDomain: string, page?: Page) {
  try {
    return await collectHomepageLinks(websiteDomain);
  } catch (error) {
    if (!page || (error instanceof Error && /robots rules/i.test(error.message))) throw error;
  }
  const homepage = normalizePublicUrl(`https://${websiteDomain}`);
  await assertRobotsAllowInBrowser(page, homepage.href, true);
  await page.goto(homepage.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForHumanVerification(page, true);
  const origin = new URL(page.url()).origin;
  const urls = await page.locator("a[href]").evaluateAll(elements => elements.map(element => (element as HTMLAnchorElement).href));
  return urls.filter(url => {
    try { return new URL(url).origin === origin; } catch { return false; }
  });
}

function rankVariantCandidateUrls(urls: string[], ingredient: Ingredient, tokens: string[]) {
  const candidates: { candidateUrl: string; matchedTokens: string[]; confidence: "HIGH" | "MEDIUM" }[] = [];
  for (const url of urls) {
    const pathMatch = matchEdProductPath(new URL(url).pathname);
    if (pathMatch?.ingredient === ingredient) {
      candidates.push({ candidateUrl: url, matchedTokens: pathMatch.matchedTokens, confidence: pathMatch.confidence });
    } else if (isEdCategoryRootPath(new URL(url).pathname)) {
      candidates.push({ candidateUrl: url, matchedTokens: tokens, confidence: "MEDIUM" });
    }
  }

  const rank = { HIGH: 0, MEDIUM: 1 } satisfies Record<"HIGH" | "MEDIUM", number>;
  return [...new Map(candidates.map((candidate) => [candidate.candidateUrl, candidate])).values()]
    .sort((a, b) => rank[a.confidence] - rank[b.confidence])
    .slice(0, 3);
}

async function findProviderVariantCandidateUrls(websiteDomain: string, ingredient: Ingredient, tokens: string[], feedCandidates: FeedCandidate[], page?: Page) {
  const fromFeeds = rankVariantCandidateUrls(feedCandidates.map((candidate) => candidate.url), ingredient, tokens);
  if (fromFeeds.length > 0) return fromFeeds;
  return rankVariantCandidateUrls(await collectProviderHomepageLinks(websiteDomain, page), ingredient, tokens);
}

// One offer per pharmacy + variant: the one linked to a product match (a staff-entered or
// match-collected price) wins over an unlinked one, so a scrape updates it instead of adding a
// duplicate beside it. `linkMatchId` is an unpriced confirmed match for this exact variant, which
// gets linked to the saved offer (as collectPriceForMatch does).
async function saveVariantScrapedOffer(providerId: string, productVariantId: string, scraped: ScrapedPrice, linkMatchId?: string) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const offers = await tx.offer.findMany({
      where: { providerId, productVariantId },
      select: { id: true, itemPricePence: true, deliveryFeePence: true, deliveryAssumption: true, productMatch: { select: { id: true } } },
      orderBy: { updatedAt: "desc" },
    });
    const existing = offers.find((offer) => offer.productMatch) ?? offers[0];
    const { packQuantity } = await tx.productVariant.findUniqueOrThrow({ where: { id: productVariantId }, select: { packQuantity: true } });
    const rejected = impossiblePriceReason({ itemPricePence: scraped.itemPricePence, packQuantity, previousItemPricePence: existing?.itemPricePence });
    if (rejected) throw new Error(rejected);
    const delivery = await resolveScrapedDelivery(tx, providerId, scraped.itemPricePence, scraped, existing);
    const offer = existing
      ? await tx.offer.update({
        where: { id: existing.id },
        data: {
          itemPricePence: scraped.itemPricePence,
          ...delivery,
          availability: scraped.availability,
          sourceUrl: scraped.sourceUrl,
          retrievedAt: now,
          priceVerifiedAt: now,
        },
      })
      : await tx.offer.create({
        data: {
          providerId,
          productVariantId,
          itemPricePence: scraped.itemPricePence,
          ...delivery,
          availability: scraped.availability,
          sourceUrl: scraped.sourceUrl,
          retrievedAt: now,
          priceVerifiedAt: now,
        },
      });

    await tx.priceHistory.create({
      data: {
        offerId: offer.id,
        itemPricePence: scraped.itemPricePence,
        deliveryFeePence: delivery.deliveryFeePence,
        deliveredTotalPence: scraped.itemPricePence + delivery.deliveryFeePence,
        availability: scraped.availability,
        effectiveFrom: now,
      },
    });

    if (linkMatchId && !existing?.productMatch) {
      await tx.productMatch.updateMany({ where: { id: linkMatchId, offerId: null }, data: { offerId: offer.id } });
    }

    return offer;
  });
}

function formatPrice(saved: { itemPricePence: number; deliveryFeePence: number }) {
  const item = `£${(saved.itemPricePence / 100).toFixed(2)}`;
  const delivery = saved.deliveryFeePence > 0 ? ` + £${(saved.deliveryFeePence / 100).toFixed(2)} delivery` : "";
  return `${item}${delivery}`;
}

async function recordVariantOffer(staffUserId: string, providerId: string, productVariantId: string, scraped: ScrapedPrice, collection: string, linkMatchId?: string) {
  const offer = await saveVariantScrapedOffer(providerId, productVariantId, scraped, linkMatchId);
  await recordAuditLog({
    actorId: staffUserId,
    action: "UPDATE",
    entityType: "Offer",
    entityId: offer.id,
    changes: {
      productVariantId,
      providerId,
      itemPricePence: scraped.itemPricePence,
      deliveryFeePence: offer.deliveryFeePence,
      source: scraped.source,
      collection,
    },
  });
  // The price as saved: the delivery fee may come from the approved policy, not from this page.
  return formatPrice(offer);
}

const sourceLabels = {
  "merchant-feed": "product feed",
  "json-ld-product-offer": "page price data",
  "bigcommerce-page-data": "store page data",
  "woocommerce-variation-data": "product options data",
  "pharmacy-plugin-price-list": "product options data",
  "next-data-variants": "product options data",
  "per-tablet-price-table": "product options data",
  "shopify-product-meta": "product options data",
  "price-grid-table": "price table",
  "price-table-columns": "price list",
  "select-option-data": "product options data",
  "price-checker-dropdown": "price checker",
  "rendered-product-card": "rendered page",
} satisfies Record<ScrapedPrice["source"], string>;

// Step 1 of the per-pharmacy order: never throws (collectFeedCandidates skips missing/blocked
// feeds), and the candidates it returns double as step 2's URL source for the fallback pass.
async function checkProviderFeeds(websiteDomain: string, name: string, tokens: string[], variant: VariantSpec, onProgress: ScrapeProgress) {
  onProgress(`Checking ${name}'s sitemaps and product feeds…`);
  const feedCandidates = await collectFeedCandidates(websiteDomain);
  return { feedCandidates, feedPrice: pickFeedVariantPrice(feedCandidates, tokens, variant) };
}

export async function runVariantScrape(
  productVariantId: string,
  staffUserId: string,
  onProgress: ScrapeProgress = noopProgress,
): Promise<VariantScrapeResult> {
  onProgress("Loading product variant details…");
  const variant = await prisma.productVariant.findUnique({
    where: { id: productVariantId },
    select: { ingredient: true, brandName: true, strengthMg: true, packQuantity: true, formulation: true },
  });
  if (!variant) throw new Error("Product variant not found.");
  const tokens = variantTokens(variant);
  const variantSpec = { strengthMg: variant.strengthMg, packQuantity: variant.packQuantity, generic: isGenericFormulation(variant.formulation) };

  const matches = await prisma.productMatch.findMany({
    // An exact variant match is authoritative. Ingredient-level matches that staff have not yet
    // assigned remain useful discovery fallbacks, but pages already assigned to another variant
    // (for example prescription Viagra) must never be tried for Viagra Connect.
    where: {
      matchedIngredient: variant.ingredient,
      status: "CONFIRMED",
      OR: [{ productVariantId }, { productVariantId: null }],
    },
    select: { id: true, providerId: true, productVariantId: true, offerId: true, candidateUrl: true, provider: { select: { tradingName: true, websiteDomain: true, discoveryCandidates: { where: { postcode: { not: null } }, select: { postcode: true }, take: 1 } } } },
    orderBy: { reviewedAt: "desc" },
  });
  // One page per pharmacy: its match for this exact variant when there is one (e.g. a staff-entered
  // price's product page), otherwise its latest unassigned ingredient-level match.
  matches.sort((a, b) => Number(b.productVariantId === productVariantId) - Number(a.productVariantId === productVariantId));
  // With no confirmed matches, continue to the provider-site fallback below.
  // Newly discovered pharmacies can have product pages before staff match them.
  onProgress(matches.length > 0
    ? `Found ${matches.length} confirmed product match${matches.length === 1 ? "" : "es"} to check.`
    : "No confirmed product matches — checking provider websites directly.");

  let humanBrowser: Awaited<ReturnType<typeof openHumanBrowser>> | undefined;
  // Runs `attempt` automatically first; only if that hits a security check does it (re)open the
  // visible Chrome window and retry there, waiting for a person to complete the check.
  async function withSecurityCheckFallback<T>(name: string, attempt: (page?: Page) => Promise<T>): Promise<T> {
    try {
      return await attempt();
    } catch (error) {
      if (!isSecurityCheck(error)) throw error;
    }
    if (humanBrowser?.page.isClosed()) {
      await humanBrowser.close();
      humanBrowser = undefined;
    }
    if (!humanBrowser) {
      humanBrowser = await openHumanBrowser();
      onProgress("Opened the Chrome window on the server computer for security checks; it stays open for the rest of this run.");
    }
    onProgress(`${name} is showing a security check — complete it in the Chrome window (waiting up to 5 minutes).`);
    return attempt(humanBrowser.page);
  }
  const scrapePage = (url: string, name: string, postcode?: string) => withSecurityCheckFallback(name, (page) => scrapeProductPrice(url, {
    humanAssist: Boolean(page),
    page,
    matchedTokens: tokens,
    variant: variantSpec,
    postcode,
    onProgress: (message) => onProgress(`${name}: ${message}`),
  }));
  try {
    let scraped = 0;
    let failed = 0;
    const attemptedProviderIds = new Set<string>();
    for (const match of matches) {
      if (attemptedProviderIds.has(match.providerId)) continue;
      attemptedProviderIds.add(match.providerId);
      const name = match.provider.tradingName;
      onProgress(`Checking ${name}…`);
      try {
        const { feedPrice } = await checkProviderFeeds(match.provider.websiteDomain, name, tokens, variantSpec, onProgress);
        const scrapedPrice = feedPrice ?? await scrapePage(match.candidateUrl, name, match.provider.discoveryCandidates[0]?.postcode ?? undefined);
        const linkMatchId = match.productVariantId === productVariantId && !match.offerId ? match.id : undefined;
        const savedPrice = await recordVariantOffer(staffUserId, match.providerId, productVariantId, scrapedPrice, "variant-row", linkMatchId);
        await prisma.productMatch.update({
          where: { id: match.id },
          data: {
            lastScrapedAt: new Date(),
            lastScrapeStatus: "SCRAPED",
            lastScrapeError: null,
            requiresHumanAssist: false,
          },
        });
        scraped += 1;
        onProgress(`Saved ${savedPrice} for ${name} (from ${sourceLabels[scrapedPrice.source]}).`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Variant price scrape failed.";
        const verification = needsVerification(error);
        await prisma.productMatch.update({
          where: { id: match.id },
          data: {
            lastScrapedAt: new Date(),
            lastScrapeStatus: verification ? "HUMAN_VERIFICATION_REQUIRED" : "FAILED",
            lastScrapeError: message,
            requiresHumanAssist: verification,
          },
        });
        failed += 1;
        onProgress(`Could not get a price from ${name}: ${message}`);
      }
    }

    const fallbackProviders = await prisma.provider.findMany({
      where: { status: { not: "ARCHIVED" }, id: { notIn: [...attemptedProviderIds] } },
      select: { id: true, tradingName: true, websiteDomain: true },
    });
    if (fallbackProviders.length > 0) {
      onProgress(`Checking ${fallbackProviders.length} more pharmacy website${fallbackProviders.length === 1 ? "" : "s"} with no confirmed match yet…`);
    }

    // The page a previous run saved this variant's price from — tried before searching the site again.
    const savedPages = await prisma.offer.findMany({
      where: { productVariantId, providerId: { in: fallbackProviders.map((provider) => provider.id) } },
      select: { providerId: true, sourceUrl: true },
      orderBy: { updatedAt: "desc" },
    });
    const savedPageByProvider = new Map<string, string>();
    for (const saved of savedPages) {
      if (!savedPageByProvider.has(saved.providerId)) savedPageByProvider.set(saved.providerId, saved.sourceUrl);
    }

    for (const provider of fallbackProviders) {
      attemptedProviderIds.add(provider.id);
      const name = provider.tradingName;
      try {
        const savedPage = savedPageByProvider.get(provider.id);
        if (savedPage) {
          onProgress(`Trying ${name}'s last saved product page: ${savedPage}`);
          try {
            const scrapedPrice = await scrapePage(savedPage, name);
            const savedPrice = await recordVariantOffer(staffUserId, provider.id, productVariantId, scrapedPrice, "provider-fallback-variant-row");
            scraped += 1;
            onProgress(`Saved ${savedPrice} for ${name} (from ${sourceLabels[scrapedPrice.source]}).`);
            continue;
          } catch (error) {
            if (error instanceof HumanVerificationError) throw error;
            const message = error instanceof Error ? error.message : "no price found";
            onProgress(`${name}'s saved page gave no price (${message}) — searching the website instead.`);
          }
        }
        const { feedCandidates, feedPrice } = await checkProviderFeeds(provider.websiteDomain, name, tokens, variantSpec, onProgress);
        if (feedPrice) {
          const savedPrice = await recordVariantOffer(staffUserId, provider.id, productVariantId, feedPrice, "provider-fallback-variant-row");
          scraped += 1;
          onProgress(`Saved ${savedPrice} for ${name} (from ${sourceLabels[feedPrice.source]}).`);
          continue;
        }
        onProgress(`Searching ${name}'s website for a product page…`);
        const candidates = await withSecurityCheckFallback(name, (page) => findProviderVariantCandidateUrls(provider.websiteDomain, variant.ingredient, tokens, feedCandidates, page));
        if (candidates.length === 0) onProgress(`No likely product page found on ${name}'s website.`);
        let saved = false;
        let lastError: unknown;
        for (const candidate of candidates) {
          try {
            onProgress(`Trying ${name}: ${candidate.candidateUrl}`);
            const scrapedPrice = await scrapePage(candidate.candidateUrl, name);
            const savedPrice = await recordVariantOffer(staffUserId, provider.id, productVariantId, scrapedPrice, "provider-fallback-variant-row");
            scraped += 1;
            saved = true;
            onProgress(`Saved ${savedPrice} for ${name} (from ${sourceLabels[scrapedPrice.source]}).`);
            break;
          } catch (error) {
            if (error instanceof HumanVerificationError) throw error;
            lastError = error;
          }
        }
        if (!saved) {
          if (lastError) throw lastError;
          throw new Error("No likely product page found for this provider.");
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "Could not collect a price for this provider.";
        onProgress(`Could not get a price from ${name}: ${message}`);
      }
    }

    await recordAuditLog({
      actorId: staffUserId,
      action: "UPDATE",
      entityType: "ProductVariant",
      entityId: productVariantId,
      changes: { priceScrape: { attempted: attemptedProviderIds.size, scraped, failed } },
    });

    onProgress(`Finished — ${scraped} scraped, ${failed} failed of ${attemptedProviderIds.size} checked.`);
    return { attempted: attemptedProviderIds.size, scraped, failed };
  } finally {
    await humanBrowser?.close();
  }
}
