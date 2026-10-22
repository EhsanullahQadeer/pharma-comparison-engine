"use server";

import { requirePartner } from "@/lib/partner-auth";
import { prisma } from "@/lib/prisma";
import type { PartnerHome } from "@/types/partners";

const DAY_MS = 24 * 60 * 60 * 1000;

// The portal's first figures (the full dashboard is step C). Scoped to the signed-in partner's own
// pharmacy only — never a pharmacy id from the request — and counts only: no visitor data exists.
export async function getPartnerHome(): Promise<PartnerHome> {
  const { providerId } = await requirePartner();
  const since = new Date(Date.now() - 30 * DAY_MS);
  const [clicksLast30Days, publishedPrices] = await Promise.all([
    prisma.referralClick.count({ where: { providerId, isLikelyBot: false, createdAt: { gte: since } } }),
    prisma.offer.count({ where: { providerId, publishedAt: { not: null } } }),
  ]);
  return { clicksLast30Days, publishedPrices };
}
