"use server";

import { revalidatePath } from "next/cache";

import { collectPriceForMatch } from "@/actions/price-collection/collect-price";
import type { PriceScrapeCadence, PriceScrapeStatus } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

export type RunPriceCollectionState = {
  error?: string;
  result?: { itemPricePence: number; deliveryFeePence: number; offerId: string; created: boolean; status: PriceScrapeStatus; updatedAt: Date };
};

export type UpdatePriceScheduleState = { error?: string; ok?: boolean };

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

function isScrapeCadence(value: string): value is PriceScrapeCadence {
  return ["MANUAL", "DAILY", "WEEKLY", "MONTHLY"].includes(value);
}

// A MANUAL cadence is never scheduled; a scheduled match is due straight away.
function scheduleData(cadence: PriceScrapeCadence, enabled: boolean) {
  const scheduled = enabled && cadence !== "MANUAL";
  return {
    scrapeEnabled: scheduled,
    scrapeCadence: cadence,
    nextScrapeAt: scheduled ? new Date() : null,
    lastScrapeStatus: scheduled ? ("READY" as const) : ("NOT_CONFIGURED" as const),
    lastScrapeError: null,
  };
}

export async function updatePriceCollectionSchedule(matchId: string, formData: FormData): Promise<UpdatePriceScheduleState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to update price collection settings." };
  }

  const cadence = String(formData.get("scrapeCadence") ?? "MANUAL");
  if (!isScrapeCadence(cadence)) return { error: "Choose a valid scrape cadence." };
  const schedule = scheduleData(cadence, formData.get("scrapeEnabled") === "on");

  const match = await prisma.productMatch.update({ where: { id: matchId }, data: schedule, select: { providerId: true } });

  await recordAuditLog({
    actorId: staffUser.id,
    action: "UPDATE",
    entityType: "ProductMatch",
    entityId: matchId,
    changes: { scrapeEnabled: schedule.scrapeEnabled, scrapeCadence: cadence, nextScrapeAt: schedule.nextScrapeAt },
  });

  revalidatePath(`/admin/pharmacies/${match.providerId}`);
  return { ok: true };
}

export type BulkPriceScheduleState = { error?: string; updated?: number };

type ScheduledMatch = { id: string; providerId: string; productVariantId: string | null };

// Shared write path for every multi-match schedule change (selected rows, or a whole variant).
async function applySchedule(actorId: string, matches: ScheduledMatch[], cadence: PriceScrapeCadence, changes: Record<string, string | boolean>) {
  const schedule = scheduleData(cadence, true);
  const { count } = await prisma.productMatch.updateMany({ where: { id: { in: matches.map((match) => match.id) } }, data: schedule });

  await Promise.all(matches.map((match) => recordAuditLog({
    actorId,
    action: "UPDATE",
    entityType: "ProductMatch",
    entityId: match.id,
    changes: { scrapeEnabled: schedule.scrapeEnabled, scrapeCadence: cadence, nextScrapeAt: schedule.nextScrapeAt, ...changes },
  })));

  new Set(matches.map((match) => match.providerId)).forEach((providerId) => revalidatePath(`/admin/pharmacies/${providerId}`));
  new Set(matches.flatMap((match) => match.productVariantId ?? [])).forEach((variantId) => revalidatePath(`/admin/catalogue/product-variants/${variantId}/prices`));
  revalidatePath("/admin/catalogue/product-variants");
  return count;
}

// Bulk form of updatePriceCollectionSchedule: choosing a cadence turns scheduling on, MANUAL turns it off.
export async function updatePriceCollectionSchedules(matchIds: string[], cadence: PriceScrapeCadence): Promise<BulkPriceScheduleState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to update price collection settings." };
  }

  if (!isScrapeCadence(cadence)) return { error: "Choose a valid scrape cadence." };
  const ids = matchIds.filter(Boolean);
  if (ids.length === 0) return { error: "None of the selected rows are tracked from a product page." };
  if (ids.length > 500) return { error: "Select 500 rows or fewer." };

  const matches = await prisma.productMatch.findMany({ where: { id: { in: ids } }, select: { id: true, providerId: true, productVariantId: true } });
  return { updated: await applySchedule(staffUser.id, matches, cadence, { bulk: true }) };
}

// Variant-wide schedule: every confirmed pharmacy product page for this exact variant.
export async function updateVariantPriceSchedule(productVariantId: string, cadence: PriceScrapeCadence): Promise<BulkPriceScheduleState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to update price collection settings." };
  }

  if (!isScrapeCadence(cadence)) return { error: "Choose a valid scrape cadence." };
  const matches = await prisma.productMatch.findMany({ where: { productVariantId, status: "CONFIRMED" }, select: { id: true, providerId: true, productVariantId: true } });
  if (matches.length === 0) return { error: "No confirmed pharmacy product pages for this variant yet." };
  return { updated: await applySchedule(staffUser.id, matches, cadence, { variantWide: productVariantId }) };
}

export async function getPendingPriceCollectionForProvider(providerId: string) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  return prisma.productMatch.findMany({
    where: { providerId, status: "CONFIRMED" },
    orderBy: { reviewedAt: "desc" },
    include: {
      productVariant: { select: { id: true, ingredient: true, brandName: true, strengthMg: true, packQuantity: true, formulation: true } },
    },
  });
}
