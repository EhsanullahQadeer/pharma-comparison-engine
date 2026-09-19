"use server";

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/audit-log";
import { scrapeProductPrice } from "@/lib/price-collection/scrape-price";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

export type RunPriceCollectionState = {
  error?: string;
  result?: { itemPricePence: number; deliveryFeePence: number; offerId: string; created: boolean };
};

// Manual "Collect price" trigger, one confirmed ProductMatch at a time (pilot scope — see
// docs/current-tasks.md's 2026-09-18 entry). The first successful scrape creates the Offer itself
// (never at confirm time — see confirmProductMatch) always unpublished (publishedAt stays null);
// a later scrape updates that same Offer's price/fees/availability and appends PriceHistory.
// Deliberately does not auto-publish or gate on a >20% move: nothing here is shown to end users
// yet (no public comparison UI reads Offer data — M5 checklist), so the real safety gate is the
// existing staff-driven "publish" step on the offer edit screen, not a new validation queue.
export async function runPriceCollectionForMatch(matchId: string): Promise<RunPriceCollectionState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to run price collection." };
  }

  const match = await prisma.productMatch.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Product match not found." };
  if (match.status !== "CONFIRMED" || !match.productVariantId) return { error: "Confirm this match with a product variant before collecting a price." };
  const productVariantId = match.productVariantId;

  let scraped;
  try {
    scraped = await scrapeProductPrice(match.candidateUrl);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Price collection failed." };
  }

  const now = new Date();
  const deliveredTotalPence = scraped.itemPricePence + scraped.deliveryFeePence;
  const created = !match.offerId;

  const offerId = await prisma.$transaction(async (tx) => {
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

    if (created) await tx.productMatch.update({ where: { id: match.id }, data: { offerId: offer.id } });

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

    return offer.id;
  });

  await recordAuditLog({
    actorId: staffUser.id,
    action: created ? "CREATE" : "UPDATE",
    entityType: "Offer",
    entityId: offerId,
    changes: { itemPricePence: scraped.itemPricePence, deliveryFeePence: scraped.deliveryFeePence, source: "price-collection-pilot" },
  });

  revalidatePath(`/admin/pharmacies/${match.providerId}`);
  return { result: { itemPricePence: scraped.itemPricePence, deliveryFeePence: scraped.deliveryFeePence, offerId, created } };
}

// Confirmed matches still needing their first price collected, for a provider's detail page.
export async function getPendingPriceCollectionForProvider(providerId: string) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  return prisma.productMatch.findMany({
    where: { providerId, status: "CONFIRMED" },
    orderBy: { reviewedAt: "desc" },
    include: { productVariant: { select: { ingredient: true, brandName: true, strengthMg: true, packQuantity: true, formulation: true } } },
  });
}
