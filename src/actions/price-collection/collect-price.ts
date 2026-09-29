// Server-only price collection for one confirmed product match, shared by the staff actions and
// the scheduled worker. Deliberately NOT a "use server" module: that would expose it as a public
// endpoint anyone could call to trigger scrapes and overwrite prices without signing in. Callers
// do their own staff check (runPriceCollectionForMatch, product-match confirmation); the worker
// runs outside the web app.

import type { PriceScrapeStatus } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { nextScrapeAt } from "@/lib/price-collection/cadence";
import { impossiblePriceReason } from "@/lib/price-collection/price-sanity";
import { scrapeProductPrice } from "@/lib/price-collection/scrape-price";
import { isGenericFormulation, variantTokens } from "@/lib/price-collection/variant-label";
import { prisma } from "@/lib/prisma";

function isHumanVerificationError(message: string) {
  return /manual verification|human-verification|captcha|verify you are human|checking your browser/i.test(message);
}

function statusForError(message: string): PriceScrapeStatus {
  return isHumanVerificationError(message) ? "HUMAN_VERIFICATION_REQUIRED" : "FAILED";
}

export async function collectPriceForMatch(matchId: string, options: { actorId?: string; humanAssist?: boolean } = {}) {
  const match = await prisma.productMatch.findUnique({
    where: { id: matchId },
    include: {
      productVariant: { select: { ingredient: true, brandName: true, strengthMg: true, packQuantity: true, formulation: true } },
      offer: { select: { itemPricePence: true } },
    },
  });
  if (!match) throw new Error("Product match not found.");
  if (match.status !== "CONFIRMED" || !match.productVariantId) throw new Error("Confirm this match with a product variant before collecting a price.");
  const productVariantId = match.productVariantId;

  try {
    const scraped = await scrapeProductPrice(match.candidateUrl, {
      // Brand first: readers treat tokens[0] as the brand when telling branded from generic, and
      // detection stores the ingredient first (["sildenafil", "viagra"]), which rejected every
      // branded pack. The variant's own tokens lead; any extra detected words follow.
      matchedTokens: match.productVariant
        ? [...new Set([...variantTokens(match.productVariant), ...match.matchedTokens])]
        : match.matchedTokens,
      // A page can carry a match per strength/pack, so only this match's exact variant may be priced.
      variant: match.productVariant
        ? { strengthMg: match.productVariant.strengthMg, packQuantity: match.productVariant.packQuantity, generic: isGenericFormulation(match.productVariant.formulation) }
        : undefined,
      humanAssist: options.humanAssist,
    });

    if (match.productVariant) {
      const rejected = impossiblePriceReason({ itemPricePence: scraped.itemPricePence, packQuantity: match.productVariant.packQuantity, previousItemPricePence: match.offer?.itemPricePence });
      if (rejected) throw new Error(rejected);
    }

    const now = new Date();
    const deliveredTotalPence = scraped.itemPricePence + scraped.deliveryFeePence;
    const created = !match.offerId;

    const savedOffer = await prisma.$transaction(async (tx) => {
      const offer = match.offerId
        ? await tx.offer.update({
          where: { id: match.offerId },
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
            providerId: match.providerId,
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

      await tx.productMatch.update({
        where: { id: match.id },
        data: {
          offerId: offer.id,
          lastScrapedAt: now,
          lastScrapeStatus: "SCRAPED",
          lastScrapeError: null,
          requiresHumanAssist: false,
          nextScrapeAt: match.scrapeEnabled ? nextScrapeAt(match.scrapeCadence, now) : null,
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

      return { id: offer.id, updatedAt: offer.updatedAt };
    });

    await recordAuditLog({
      actorId: options.actorId ?? null,
      action: created ? "CREATE" : "UPDATE",
      entityType: "Offer",
      entityId: savedOffer.id,
      changes: {
        itemPricePence: scraped.itemPricePence,
        deliveryFeePence: scraped.deliveryFeePence,
        source: scraped.source,
        collection: options.humanAssist ? "human-assisted" : "automatic",
      },
    });

    return { itemPricePence: scraped.itemPricePence, deliveryFeePence: scraped.deliveryFeePence, offerId: savedOffer.id, created, status: "SCRAPED" as const, updatedAt: savedOffer.updatedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Price collection failed.";
    const status = statusForError(message);
    await prisma.productMatch.update({
      where: { id: match.id },
      data: {
        lastScrapedAt: new Date(),
        lastScrapeStatus: status,
        lastScrapeError: message,
        requiresHumanAssist: status === "HUMAN_VERIFICATION_REQUIRED",
      },
    });
    throw new Error(message);
  }
}
