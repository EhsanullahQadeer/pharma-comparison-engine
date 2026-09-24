"use server";

import { revalidatePath } from "next/cache";

import type { PriceScrapeCadence, PriceScrapeStatus } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { scrapeProductPrice } from "@/lib/price-collection/scrape-price";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

export type RunPriceCollectionState = {
  error?: string;
  result?: { itemPricePence: number; deliveryFeePence: number; offerId: string; created: boolean; status: PriceScrapeStatus; updatedAt: Date };
};

export type UpdatePriceScheduleState = { error?: string; ok?: boolean };

const cadenceDays: Record<Exclude<PriceScrapeCadence, "MANUAL">, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
};

function nextScrapeAt(cadence: PriceScrapeCadence, from = new Date()) {
  if (cadence === "MANUAL") return null;
  const date = new Date(from);
  date.setDate(date.getDate() + cadenceDays[cadence]);
  return date;
}

function isHumanVerificationError(message: string) {
  return /manual verification|human-verification|captcha|verify you are human|checking your browser/i.test(message);
}

function statusForError(message: string): PriceScrapeStatus {
  return isHumanVerificationError(message) ? "HUMAN_VERIFICATION_REQUIRED" : "FAILED";
}

export async function collectPriceForMatch(matchId: string, options: { actorId?: string; humanAssist?: boolean } = {}) {
  const match = await prisma.productMatch.findUnique({
    where: { id: matchId },
    include: { productVariant: { select: { strengthMg: true, packQuantity: true } } },
  });
  if (!match) throw new Error("Product match not found.");
  if (match.status !== "CONFIRMED" || !match.productVariantId) throw new Error("Confirm this match with a product variant before collecting a price.");
  const productVariantId = match.productVariantId;

  try {
    const scraped = await scrapeProductPrice(match.candidateUrl, {
      matchedTokens: match.matchedTokens,
      // A page can carry a match per strength/pack, so only this match's exact variant may be priced.
      variant: match.productVariant ?? undefined,
      humanAssist: options.humanAssist,
    });

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

export async function runPriceCollectionForMatch(matchId: string, humanAssist = false): Promise<RunPriceCollectionState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to run price collection." };
  }

  try {
    const result = await collectPriceForMatch(matchId, { actorId: staffUser.id, humanAssist });
    const match = await prisma.productMatch.findUnique({ where: { id: matchId }, select: { providerId: true } });
    if (match) revalidatePath(`/admin/pharmacies/${match.providerId}`);
    return { result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Price collection failed." };
  }
}

export async function updatePriceCollectionSchedule(matchId: string, formData: FormData): Promise<UpdatePriceScheduleState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to update price collection settings." };
  }

  const cadence = String(formData.get("scrapeCadence") ?? "MANUAL") as PriceScrapeCadence;
  if (!["MANUAL", "DAILY", "WEEKLY", "MONTHLY"].includes(cadence)) return { error: "Choose a valid scrape cadence." };
  const enabled = formData.get("scrapeEnabled") === "on" && cadence !== "MANUAL";
  const next = enabled ? new Date() : null;

  const match = await prisma.productMatch.update({
    where: { id: matchId },
    data: {
      scrapeEnabled: enabled,
      scrapeCadence: cadence,
      nextScrapeAt: next,
      lastScrapeStatus: enabled ? "READY" : "NOT_CONFIGURED",
      lastScrapeError: null,
    },
    select: { providerId: true },
  });

  await recordAuditLog({
    actorId: staffUser.id,
    action: "UPDATE",
    entityType: "ProductMatch",
    entityId: matchId,
    changes: { scrapeEnabled: enabled, scrapeCadence: cadence, nextScrapeAt: next },
  });

  revalidatePath(`/admin/pharmacies/${match.providerId}`);
  return { ok: true };
}

export async function getPendingPriceCollectionForProvider(providerId: string) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  return prisma.productMatch.findMany({
    where: { providerId, status: "CONFIRMED" },
    orderBy: { reviewedAt: "desc" },
    include: {
      productVariant: { select: { ingredient: true, brandName: true, strengthMg: true, packQuantity: true, formulation: true } },
      offer: { select: { itemPricePence: true, deliveryFeePence: true, retrievedAt: true, updatedAt: true, publishedAt: true } },
    },
  });
}
