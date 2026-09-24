import type { Ingredient } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { normalizePublicUrl } from "@/lib/discovery/public-web-policy";
import { HumanVerificationError, openHumanBrowser, waitForHumanVerification } from "@/lib/price-collection/human-browser";
import { scrapeProductPrice, type ScrapedPrice } from "@/lib/price-collection/scrape-price";
import { prisma } from "@/lib/prisma";
import { collectCandidateUrls } from "@/lib/product-detection/detect-products";
import { edCategoryRootSegments, matchEdProductPath } from "@/lib/product-detection/ed-tokens";

import type { Page } from "patchright";

// The orchestration behind ProductVariantPriceActions' "Scrape prices"/"Human scrape" buttons.
// Lives outside the "use server" actions file (which may only export async functions) so both the
// plain server action (scrapePricesForVariant, no live feedback) and the SSE route handler
// (app/api/product-variants/[id]/scrape-stream) can call the exact same logic — one place for the
// loop, no risk of the two callers drifting apart.

export type VariantScrapeResult = { attempted: number; scraped: number; failed: number };
export type ScrapeProgress = (message: string) => void;

const noopProgress: ScrapeProgress = () => {};

function variantTokens(variant: { ingredient: Ingredient; brandName: string | null }) {
  const tokenMap = {
    SILDENAFIL: ["sildenafil", "viagra"],
    TADALAFIL: ["tadalafil", "cialis"],
  } satisfies Record<Ingredient, string[]>;
  return [...new Set([...(variant.brandName ? [variant.brandName.toLowerCase()] : []), ...tokenMap[variant.ingredient]])];
}

function isEdCategoryRoot(url: string) {
  const segments = new URL(url).pathname.split("/").filter(Boolean).map((segment) => segment.toLowerCase());
  return segments.length === 1 && edCategoryRootSegments.has(segments[0]);
}

async function findProviderVariantCandidateUrls(websiteDomain: string, ingredient: Ingredient, tokens: string[], page?: Page) {
  let urls: string[];
  if (page) {
    const homepage = normalizePublicUrl(`https://${websiteDomain}`);
    await page.goto(homepage.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await waitForHumanVerification(page, true);
    const origin = new URL(page.url()).origin;
    urls = await page.locator("a[href]").evaluateAll(elements => elements.map(element => (element as HTMLAnchorElement).href));
    urls = urls.filter(url => {
      try { return new URL(url).origin === origin; } catch { return false; }
    });
  } else {
    urls = await collectCandidateUrls(websiteDomain);
  }
  const candidates: { candidateUrl: string; matchedTokens: string[]; confidence: "HIGH" | "MEDIUM" }[] = [];
  for (const url of urls) {
    const pathMatch = matchEdProductPath(new URL(url).pathname);
    if (pathMatch?.ingredient === ingredient) {
      candidates.push({ candidateUrl: url, matchedTokens: pathMatch.matchedTokens, confidence: pathMatch.confidence });
    } else if (isEdCategoryRoot(url)) {
      candidates.push({ candidateUrl: url, matchedTokens: tokens, confidence: "MEDIUM" });
    }
  }

  const rank = { HIGH: 0, MEDIUM: 1 } satisfies Record<"HIGH" | "MEDIUM", number>;
  return [...new Map(candidates.map((candidate) => [candidate.candidateUrl, candidate])).values()]
    .sort((a, b) => rank[a.confidence] - rank[b.confidence])
    .slice(0, 3);
}

async function saveVariantScrapedOffer(providerId: string, productVariantId: string, scraped: ScrapedPrice) {
  const now = new Date();
  const deliveredTotalPence = scraped.itemPricePence + scraped.deliveryFeePence;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.offer.findFirst({
      where: { providerId, productVariantId, productMatch: null },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
    const offer = existing
      ? await tx.offer.update({
        where: { id: existing.id },
        data: {
          itemPricePence: scraped.itemPricePence,
          deliveryFeePence: scraped.deliveryFeePence,
          deliveryAssumption: scraped.deliveryAssumption,
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
          deliveryFeePence: scraped.deliveryFeePence,
          deliveryAssumption: scraped.deliveryAssumption,
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
        deliveryFeePence: scraped.deliveryFeePence,
        deliveredTotalPence,
        availability: scraped.availability,
        effectiveFrom: now,
      },
    });

    return offer;
  });
}

function formatPrice(scraped: ScrapedPrice) {
  const item = `£${(scraped.itemPricePence / 100).toFixed(2)}`;
  const delivery = scraped.deliveryFeePence > 0 ? ` + £${(scraped.deliveryFeePence / 100).toFixed(2)} delivery` : "";
  return `${item}${delivery}`;
}

export async function runVariantScrape(
  productVariantId: string,
  humanAssist: boolean,
  staffUserId: string,
  onProgress: ScrapeProgress = noopProgress,
): Promise<VariantScrapeResult> {
  onProgress("Loading product variant details…");
  const variant = await prisma.productVariant.findUnique({
    where: { id: productVariantId },
    select: { ingredient: true, brandName: true, strengthMg: true, packQuantity: true },
  });
  if (!variant) throw new Error("Product variant not found.");
  const tokens = variantTokens(variant);

  const matches = await prisma.productMatch.findMany({
    where: { matchedIngredient: variant.ingredient, status: "CONFIRMED" },
    select: { id: true, providerId: true, candidateUrl: true, matchedTokens: true, provider: { select: { tradingName: true } } },
    orderBy: [{ productVariantId: "desc" }, { reviewedAt: "desc" }],
  });
  // With no confirmed matches, continue to the provider-site fallback below.
  // Newly discovered pharmacies can have product pages before staff match them.
  onProgress(matches.length > 0
    ? `Found ${matches.length} confirmed product match${matches.length === 1 ? "" : "es"} to check.`
    : "No confirmed product matches — checking provider websites directly.");

  const humanBrowser = humanAssist ? await openHumanBrowser() : undefined;
  if (humanAssist) onProgress("Opened the scraping browser. Complete any verification prompts as they appear.");
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
        const scrapedPrice = await scrapeProductPrice(match.candidateUrl, {
          humanAssist,
          page: humanBrowser?.page,
          matchedTokens: tokens,
          variant: { strengthMg: variant.strengthMg, packQuantity: variant.packQuantity },
          onProgress: (message) => onProgress(`${name}: ${message}`),
        });
        const offer = await saveVariantScrapedOffer(match.providerId, productVariantId, scrapedPrice);
        await prisma.productMatch.update({
          where: { id: match.id },
          data: {
            lastScrapedAt: new Date(),
            lastScrapeStatus: "SCRAPED",
            lastScrapeError: null,
            requiresHumanAssist: false,
          },
        });
        await recordAuditLog({
          actorId: staffUserId,
          action: "UPDATE",
          entityType: "Offer",
          entityId: offer.id,
          changes: {
            productVariantId,
            providerId: match.providerId,
            itemPricePence: scrapedPrice.itemPricePence,
            deliveryFeePence: scrapedPrice.deliveryFeePence,
            source: scrapedPrice.source,
            collection: "variant-row",
          },
        });
        scraped += 1;
        onProgress(`Saved ${formatPrice(scrapedPrice)} for ${name}.`);
      } catch (error) {
        if (error instanceof HumanVerificationError) throw error;
        const message = error instanceof Error ? error.message : "Variant price scrape failed.";
        await prisma.productMatch.update({
          where: { id: match.id },
          data: { lastScrapedAt: new Date(), lastScrapeStatus: "FAILED", lastScrapeError: message },
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

    for (const provider of fallbackProviders) {
      attemptedProviderIds.add(provider.id);
      const name = provider.tradingName;
      try {
        onProgress(`Searching ${name}'s website for a product page…`);
        const candidates = await findProviderVariantCandidateUrls(provider.websiteDomain, variant.ingredient, tokens, humanBrowser?.page);
        if (candidates.length === 0) onProgress(`No likely product page found on ${name}'s website.`);
        let saved = false;
        let lastError: unknown;
        for (const candidate of candidates) {
          try {
            onProgress(`Trying ${name}: ${candidate.candidateUrl}`);
            const scrapedPrice = await scrapeProductPrice(candidate.candidateUrl, {
              humanAssist,
              page: humanBrowser?.page,
              matchedTokens: tokens,
              variant: { strengthMg: variant.strengthMg, packQuantity: variant.packQuantity },
              onProgress: (message) => onProgress(`${name}: ${message}`),
            });
            const offer = await saveVariantScrapedOffer(provider.id, productVariantId, scrapedPrice);
            await recordAuditLog({
              actorId: staffUserId,
              action: "UPDATE",
              entityType: "Offer",
              entityId: offer.id,
              changes: {
                productVariantId,
                providerId: provider.id,
                itemPricePence: scrapedPrice.itemPricePence,
                deliveryFeePence: scrapedPrice.deliveryFeePence,
                source: scrapedPrice.source,
                collection: "provider-fallback-variant-row",
              },
            });
            scraped += 1;
            saved = true;
            onProgress(`Saved ${formatPrice(scrapedPrice)} for ${name}.`);
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
        if (error instanceof HumanVerificationError) throw error;
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
