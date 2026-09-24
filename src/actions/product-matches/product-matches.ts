"use server";

import { revalidatePath } from "next/cache";

import { collectPriceForMatch } from "@/actions/price-collection/price-collection";
import { recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { detectEdProductMatches } from "@/lib/product-detection/detect-products";
import { requireStaffRole } from "@/lib/staff-auth";

export type RunProductDetectionState = {
  error?: string;
  result?: { candidatesSeen: number; newMatches: number };
};

// Manual "Run now" trigger, one provider at a time (pilot scope — see docs/current-tasks.md's
// 2026-09-18 entry). Re-running is safe: matches already staff-reviewed (CONFIRMED/REJECTED) are
// left untouched via the (providerId, candidateUrl) unique constraint; only a still-NEW match gets
// its signals refreshed, and a genuinely new URL creates a new NEW row.
export async function runProductDetectionForProvider(providerId: string): Promise<RunProductDetectionState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to run product detection." };
  }

  const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { id: true, websiteDomain: true } });
  if (!provider) return { error: "Provider not found." };

  let detected;
  try {
    detected = await detectEdProductMatches(provider.websiteDomain);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Product detection failed." };
  }

  let newMatches = 0;
  for (const match of detected) {
    // A page can hold one match per variant, so "already known" means any match on this page.
    const existing = await prisma.productMatch.findMany({
      where: { providerId, candidateUrl: match.candidateUrl },
      select: { id: true, status: true },
    });
    if (existing.length === 0) {
      await prisma.productMatch.create({
        data: { providerId, candidateUrl: match.candidateUrl, matchedIngredient: match.ingredient, matchedTokens: match.matchedTokens, confidence: match.confidence },
      });
      newMatches += 1;
    } else {
      // Refresh the signals on a still-undecided match; a CONFIRMED/REJECTED one is left alone.
      await prisma.productMatch.updateMany({
        where: { id: { in: existing.filter((row) => row.status === "NEW").map((row) => row.id) } },
        data: { matchedIngredient: match.ingredient, matchedTokens: match.matchedTokens, confidence: match.confidence },
      });
    }
  }

  await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "ProductMatch", entityId: providerId, changes: { candidatesSeen: detected.length, newMatches } });

  revalidatePath(`/admin/pharmacies/${providerId}`);
  revalidatePath("/admin/reviews");
  return { result: { candidatesSeen: detected.length, newMatches } };
}

// Only matches a staff member hasn't yet acted on — same reviewedAt-drives-queue-membership
// pattern as getDiscoveryCandidatesForReview.
export async function getProductMatchesForReview() {
  await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  return prisma.productMatch.findMany({
    where: { status: "NEW", reviewedAt: null },
    orderBy: { detectedAt: "desc" },
    include: { provider: { select: { id: true, tradingName: true } } },
  });
}

export type ConfirmProductMatchState = { error?: string };

// Picking the exact ProductVariant is a deliberate staff decision — detection only narrows down to
// an ingredient, never a specific strength/pack. Does not create an Offer: that needs a real price,
// which only exists once the price-collection pilot's first scrape succeeds (not built yet).
export async function confirmProductMatch(matchId: string, productVariantId: string): Promise<ConfirmProductMatchState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to review product matches." };
  }

  const match = await prisma.productMatch.findUnique({ where: { id: matchId }, select: { id: true, reviewedAt: true } });
  if (!match) return { error: "Product match not found." };
  if (match.reviewedAt) return { error: "This match has already been reviewed." };

  const variant = await prisma.productVariant.findUnique({ where: { id: productVariantId }, select: { id: true } });
  if (!variant) return { error: "Product variant not found." };

  await prisma.productMatch.update({
    where: { id: matchId },
    data: { status: "CONFIRMED", productVariantId, reviewedByStaffId: staffUser.id, reviewedAt: new Date() },
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "ProductMatch", entityId: matchId, changes: { status: "CONFIRMED", productVariantId } });

  revalidatePath("/admin/reviews");
  return {};
}

export type ConfirmAndCollectProductMatchState = {
  error?: string;
  result?: { itemPricePence: number; deliveryFeePence: number; updatedAt: Date };
};

export async function confirmAndCollectProductMatch(matchId: string, productVariantId: string, humanAssist = false): Promise<ConfirmAndCollectProductMatchState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to review product matches." };
  }

  const confirmResult = await confirmProductMatch(matchId, productVariantId);
  if (confirmResult.error) return confirmResult;

  try {
    const result = await collectPriceForMatch(matchId, { actorId: staffUser.id, humanAssist });
    const match = await prisma.productMatch.findUnique({ where: { id: matchId }, select: { providerId: true } });
    if (match) revalidatePath(`/admin/pharmacies/${match.providerId}`);
    revalidatePath("/admin/reviews");
    return { result: { itemPricePence: result.itemPricePence, deliveryFeePence: result.deliveryFeePence, updatedAt: result.updatedAt } };
  } catch (error) {
    return { error: error instanceof Error ? `Match confirmed, but price scraping failed: ${error.message}` : "Match confirmed, but price scraping failed." };
  }
}

export type RejectProductMatchState = { error?: string };

export async function rejectProductMatch(matchId: string): Promise<RejectProductMatchState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to review product matches." };
  }

  const match = await prisma.productMatch.findUnique({ where: { id: matchId }, select: { id: true, reviewedAt: true } });
  if (!match) return { error: "Product match not found." };
  if (match.reviewedAt) return { error: "This match has already been reviewed." };

  await prisma.productMatch.update({
    where: { id: matchId },
    data: { status: "REJECTED", reviewedByStaffId: staffUser.id, reviewedAt: new Date() },
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "ProductMatch", entityId: matchId, changes: { status: "REJECTED" } });

  revalidatePath("/admin/reviews");
  return {};
}
