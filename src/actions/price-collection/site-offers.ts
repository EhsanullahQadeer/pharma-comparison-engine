"use server";

import { revalidatePath } from "next/cache";

import { recordAuditLog } from "@/lib/audit-log";
import { collectSiteOffers, type SiteOffersCheckResult } from "@/lib/price-collection/collect-site-offers";
import { applyDeliveryPolicyToOffers } from "@/lib/price-collection/delivery-policy";
import { recordPriceHistorySnapshot } from "@/lib/price-history";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";
import type { ProviderSiteOffers } from "@/types/pricing";

export type SiteOffersState = { error?: string; result?: SiteOffersCheckResult };
export type SiteOfferDecision = "APPROVED" | "DISMISSED";

const NOT_AUTHORIZED = "You are not authorized to review delivery charges and discounts.";

async function requireReviewer() {
  try {
    return await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return null;
  }
}

// Pending and approved findings for one pharmacy; dismissed ones are kept only so they aren't
// suggested again.
export async function getProviderSiteOffers(providerId: string): Promise<ProviderSiteOffers> {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  const [provider, deliveryPolicies, discounts] = await Promise.all([
    prisma.provider.findUnique({ where: { id: providerId }, select: { siteOffersCheckedAt: true } }),
    prisma.deliveryPolicy.findMany({ where: { providerId, status: { not: "DISMISSED" } }, orderBy: { createdAt: "desc" } }),
    prisma.discount.findMany({ where: { providerId, status: { not: "DISMISSED" } }, orderBy: { createdAt: "desc" } }),
  ]);
  return { checkedAt: provider?.siteOffersCheckedAt ?? null, deliveryPolicies, discounts };
}

export async function checkProviderSiteOffers(providerId: string): Promise<SiteOffersState> {
  if (!(await requireReviewer())) return { error: NOT_AUTHORIZED };
  try {
    const result = await collectSiteOffers(providerId);
    revalidatePath(`/admin/pharmacies/${providerId}`);
    return { result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The pharmacy's website could not be read." };
  }
}

// Approving a delivery policy replaces any earlier approved one and sets the delivery fee on every
// offer the pharmacy has (marking those fees verified), recording a price-history entry for each offer whose fee changed.
export async function reviewDeliveryPolicy(policyId: string, decision: SiteOfferDecision): Promise<SiteOffersState> {
  const staffUser = await requireReviewer();
  if (!staffUser) return { error: NOT_AUTHORIZED };

  const policy = await prisma.deliveryPolicy.findUnique({ where: { id: policyId } });
  if (!policy) return { error: "This delivery charge is no longer on record." };

  const changedOffers = await prisma.$transaction(async (tx) => {
    if (decision === "APPROVED") await tx.deliveryPolicy.deleteMany({ where: { providerId: policy.providerId, status: "APPROVED", id: { not: policy.id } } });
    await tx.deliveryPolicy.update({ where: { id: policy.id }, data: { status: decision } });
    if (decision !== "APPROVED") return 0;
    const now = new Date();
    const changed = await applyDeliveryPolicyToOffers(tx, policy.providerId, policy, now);
    for (const offerId of changed) await recordPriceHistorySnapshot(tx, offerId, now);
    return changed.length;
  });

  await recordAuditLog({
    actorId: staffUser.id,
    action: "UPDATE",
    entityType: "DeliveryPolicy",
    entityId: policy.id,
    changes: { providerId: policy.providerId, status: decision, standardFeePence: policy.standardFeePence, freeOverPence: policy.freeOverPence, changedOffers },
  });
  revalidatePath(`/admin/pharmacies/${policy.providerId}`);
  return {};
}

// Only for discounts the website check found (pharmacy-level); staff-entered discounts on an offer
// are managed from that offer's Discounts dialog.
export async function reviewScrapedDiscount(discountId: string, decision: SiteOfferDecision): Promise<SiteOffersState> {
  const staffUser = await requireReviewer();
  if (!staffUser) return { error: NOT_AUTHORIZED };

  const discount = await prisma.discount.findUnique({ where: { id: discountId }, select: { id: true, providerId: true, scraped: true } });
  if (!discount?.providerId || !discount.scraped) return { error: "This discount is no longer on record." };

  await prisma.discount.update({ where: { id: discount.id }, data: { status: decision } });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Discount", entityId: discount.id, changes: { providerId: discount.providerId, status: decision } });
  revalidatePath(`/admin/pharmacies/${discount.providerId}`);
  return {};
}
