// Server-only price collection for one confirmed product match, shared by the staff actions and
// the scheduled worker. Deliberately NOT a "use server" module: that would expose it as a public
// endpoint anyone could call to trigger scrapes and overwrite prices without signing in. Callers
// do their own staff check (runPriceCollectionForMatch, product-match confirmation); the worker
// runs outside the web app.

import type { PriceScrapeStatus } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { nextScrapeAt } from "@/lib/price-collection/cadence";
import { collectSiteOffersIfDue } from "@/lib/price-collection/collect-site-offers";
import { resolveScrapedDelivery } from "@/lib/price-collection/delivery-policy";
import { impossiblePriceReason } from "@/lib/price-collection/price-sanity";
import { scrapeProductPrice } from "@/lib/price-collection/scrape-price";
import { isGenericFormulation, variantTokens } from "@/lib/price-collection/variant-label";
import { wasPriceField } from "@/lib/price-collection/was-price";
import { prisma } from "@/lib/prisma";

function isHumanVerificationError(message: string) {
  return /manual verification|human-verification|captcha|verify you are human|checking your browser/i.test(message);
}

function statusForError(message: string): PriceScrapeStatus {
  return isHumanVerificationError(message) ? "HUMAN_VERIFICATION_REQUIRED" : "FAILED";
}

// The price this pharmacy already has for a product, if any: one tracked by a product page wins
// over an untracked one (staff-entered, or saved by a variant scrape).
async function existingOfferFor(providerId: string, productVariantId: string) {
  const offers = await prisma.offer.findMany({
    where: { providerId, productVariantId },
    select: { id: true, itemPricePence: true, deliveryFeePence: true, deliveryAssumption: true, productMatch: { select: { candidateUrl: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return offers.find((offer) => offer.productMatch) ?? offers[0];
}

export async function collectPriceForMatch(matchId: string, options: { actorId?: string; humanAssist?: boolean } = {}) {
  const match = await prisma.productMatch.findUnique({
    where: { id: matchId },
    include: {
      productVariant: { select: { ingredient: true, brandName: true, strengthMg: true, packQuantity: true, formulation: true } },
      offer: { select: { itemPricePence: true, deliveryFeePence: true, deliveryAssumption: true } },
      // Its registry postcode answers shops that ask for one before showing a product.
      provider: { select: { discoveryCandidates: { where: { postcode: { not: null } }, select: { postcode: true }, take: 1 } } },
    },
  });
  if (!match) throw new Error("Product match not found.");
  if (match.status !== "CONFIRMED" || !match.productVariantId) throw new Error("Confirm this match with a product variant before collecting a price.");
  const productVariantId = match.productVariantId;

  // One price per pharmacy and product. A pack listed on several of a pharmacy's pages (Dr Fox's
  // Cialis and Tadalafil pages both list generic tadalafil) must not get a price per page: a page
  // that repeats an already-tracked product is stopped here and left for staff, while an untracked
  // price is taken over by this page instead of being duplicated.
  const existing = match.offerId ? undefined : await existingOfferFor(match.providerId, productVariantId);
  if (existing?.productMatch) {
    const message = `This pharmacy already has a price for this product, collected from ${existing.productMatch.candidateUrl}. This page lists the same product again, so no second price was saved and its price checks are switched off.`;
    await prisma.productMatch.update({
      where: { id: match.id },
      data: { lastScrapedAt: new Date(), lastScrapeStatus: "NEEDS_REVIEW", lastScrapeError: message, scrapeEnabled: false, nextScrapeAt: null },
    });
    throw new Error(message);
  }
  const offerId = match.offerId ?? existing?.id;
  const currentOffer = match.offer ?? existing;

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
      postcode: match.provider.discoveryCandidates[0]?.postcode ?? undefined,
    });

    if (match.productVariant) {
      const rejected = impossiblePriceReason({ itemPricePence: scraped.itemPricePence, packQuantity: match.productVariant.packQuantity, previousItemPricePence: currentOffer?.itemPricePence });
      if (rejected) throw new Error(rejected);
    }

    const now = new Date();
    const created = !offerId;

    const savedOffer = await prisma.$transaction(async (tx) => {
      const delivery = await resolveScrapedDelivery(tx, match.providerId, scraped.itemPricePence, scraped, currentOffer);
      const offer = offerId
        ? await tx.offer.update({
          where: { id: offerId },
          data: {
            itemPricePence: scraped.itemPricePence,
            ...delivery,
            ...wasPriceField(scraped),
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
            ...delivery,
            ...wasPriceField(scraped),
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
          deliveryFeePence: delivery.deliveryFeePence,
          ...wasPriceField(scraped),
          deliveredTotalPence: scraped.itemPricePence + delivery.deliveryFeePence,
          availability: scraped.availability,
          effectiveFrom: now,
        },
      });

      return { id: offer.id, updatedAt: offer.updatedAt, deliveryFeePence: delivery.deliveryFeePence };
    });

    await recordAuditLog({
      actorId: options.actorId ?? null,
      action: created ? "CREATE" : "UPDATE",
      entityType: "Offer",
      entityId: savedOffer.id,
      changes: {
        itemPricePence: scraped.itemPricePence,
        deliveryFeePence: savedOffer.deliveryFeePence,
        source: scraped.source,
        collection: options.humanAssist ? "human-assisted" : "automatic",
      },
    });

    await collectSiteOffersIfDue(match.providerId);

    return { itemPricePence: scraped.itemPricePence, deliveryFeePence: savedOffer.deliveryFeePence, offerId: savedOffer.id, created, status: "SCRAPED" as const, updatedAt: savedOffer.updatedAt };
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
