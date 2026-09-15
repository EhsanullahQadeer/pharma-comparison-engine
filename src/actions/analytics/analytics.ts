"use server";

import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

const WEEKS = 12;
const DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

// Every widget on the admin dashboard/analytics page is fed from this one aggregate — small
// dataset sizes at this stage of the project (a pilot-scale catalogue) make an in-process
// groupBy/bucket approach simpler and cheap enough, rather than raw SQL date-truncation.
export async function getAdminAnalytics() {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);

  const [
    providerStatusGrouped,
    regulatorGrouped,
    offerAvailabilityGrouped,
    offerPurchaseModelGrouped,
    evidenceGrouped,
    correctionGrouped,
    staffRoleGrouped,
    providersForTrend,
    recentAuditLog,
  ] = await Promise.all([
    prisma.provider.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.provider.groupBy({ by: ["regulatorType"], _count: { _all: true } }),
    prisma.offer.groupBy({ by: ["availability"], _count: { _all: true } }),
    prisma.offer.groupBy({ by: ["purchaseModel"], _count: { _all: true } }),
    prisma.evidence.groupBy({ by: ["approvedStatus"], _count: { _all: true } }),
    prisma.correction.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.staffUser.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.provider.findMany({ select: { createdAt: true } }),
    prisma.auditLog.findMany({
      where: { createdAt: { gte: new Date(Date.now() - DAYS * MS_PER_DAY) } },
      select: { createdAt: true, action: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(providerStatusGrouped.map((e) => [e.status, e._count._all]));
  const funnel = [
    { stage: "DISCOVERED" as const, count: statusCounts.DISCOVERED ?? 0 },
    { stage: "IDENTITY_VERIFIED" as const, count: statusCounts.IDENTITY_VERIFIED ?? 0 },
    { stage: "ED_CATALOGUE_VERIFIED" as const, count: statusCounts.ED_CATALOGUE_VERIFIED ?? 0 },
    { stage: "PUBLISHED" as const, count: (statusCounts.PUBLISHED ?? 0) + (statusCounts.TEMPORARILY_WITHHELD ?? 0) },
  ];

  // Weekly buckets, oldest first, for the trend chart.
  const weekBuckets = Array.from({ length: WEEKS }, (_, i) => {
    const weekStart = startOfWeek(new Date(Date.now() - (WEEKS - 1 - i) * 7 * MS_PER_DAY));
    return { weekStart, count: 0 };
  });
  for (const provider of providersForTrend) {
    const bucketStart = startOfWeek(provider.createdAt).getTime();
    const bucket = weekBuckets.find((b) => b.weekStart.getTime() === bucketStart);
    if (bucket) bucket.count += 1;
  }
  const providersByWeek = weekBuckets.map((b) => ({
    week: b.weekStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    count: b.count,
  }));

  // Daily buckets, oldest first, split by action, for the audit-activity trend.
  const dayBuckets = Array.from({ length: DAYS }, (_, i) => {
    const dayStart = startOfDay(new Date(Date.now() - (DAYS - 1 - i) * MS_PER_DAY));
    return { dayStart, CREATE: 0, UPDATE: 0, DELETE: 0 };
  });
  for (const entry of recentAuditLog) {
    const bucketStart = startOfDay(entry.createdAt).getTime();
    const bucket = dayBuckets.find((b) => b.dayStart.getTime() === bucketStart);
    if (bucket) bucket[entry.action] += 1;
  }
  const auditActivityByDay = dayBuckets.map((b) => ({
    day: b.dayStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
    CREATE: b.CREATE,
    UPDATE: b.UPDATE,
    DELETE: b.DELETE,
  }));

  return {
    funnel,
    statusDistribution: providerStatusGrouped.map((e) => ({ status: e.status, count: e._count._all })),
    regulatorMix: regulatorGrouped.map((e) => ({ regulatorType: e.regulatorType, count: e._count._all })),
    offerAvailabilityMix: offerAvailabilityGrouped.map((e) => ({ availability: e.availability, count: e._count._all })),
    offerPurchaseModelMix: offerPurchaseModelGrouped.map((e) => ({ purchaseModel: e.purchaseModel, count: e._count._all })),
    evidenceMix: evidenceGrouped.map((e) => ({ status: e.approvedStatus, count: e._count._all })),
    correctionMix: correctionGrouped.map((e) => ({ status: e.status, count: e._count._all })),
    staffByRole: staffRoleGrouped.map((e) => ({ role: e.role, count: e._count._all })),
    providersByWeek,
    auditActivityByDay,
  };
}

export type AdminAnalytics = Awaited<ReturnType<typeof getAdminAnalytics>>;
