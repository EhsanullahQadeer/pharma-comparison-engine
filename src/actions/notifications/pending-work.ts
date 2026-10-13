"use server";

import type { StaffRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getStaffUser } from "@/lib/staff-auth";
import type { PendingWorkItem, PendingWorkKind, PendingWorkPharmacy } from "@/types/pending-work";

type PendingLoad = { count: number; pharmacies?: PendingWorkPharmacy[] };
type ProviderGroup = { providerId: string | null; _count: { _all: number } };

const CATALOGUE_ROLES: StaffRole[] = ["CATALOGUE_EDITOR", "ADMINISTRATOR"];
const REVIEW_ROLES: StaffRole[] = ["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR"];
const ARTICLE_ROLES: StaffRole[] = ["CONTENT_REVIEWER", "ADMINISTRATOR"];
const ALL_ROLES: StaffRole[] = ["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"];

// Where the full per-pharmacy breakdown is shown.
const DASHBOARD_HREF = "/admin#pending-work";

const count = async (query: Promise<number>): Promise<PendingLoad> => ({ count: await query });

// Turns per-pharmacy counts (possibly from several tables) into one named, sorted list.
async function byPharmacy(...groupSets: ProviderGroup[][]): Promise<PendingLoad> {
  const totals = new Map<string, number>();
  for (const group of groupSets.flat()) {
    if (group.providerId) totals.set(group.providerId, (totals.get(group.providerId) ?? 0) + group._count._all);
  }
  const providers = await prisma.provider.findMany({ where: { id: { in: [...totals.keys()] } }, select: { id: true, tradingName: true } });
  const pharmacies = providers
    .map((provider) => ({ id: provider.id, name: provider.tradingName, count: totals.get(provider.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { count: pharmacies.reduce((sum, pharmacy) => sum + pharmacy.count, 0), pharmacies };
}

// Each kind uses the same selection as the screen its work is done on, and is only shown to the
// roles that can act on it there.
const sources: { kind: PendingWorkKind; roles: StaffRole[]; href: string; load: () => Promise<PendingLoad> }[] = [
  {
    kind: "candidates",
    roles: CATALOGUE_ROLES,
    href: "/admin/reviews?tab=candidates",
    load: () => count(prisma.discoveryCandidate.count({ where: { status: { in: ["NEW", "LINKED_EXISTING"] }, reviewedAt: null } })),
  },
  {
    kind: "productMatches",
    roles: CATALOGUE_ROLES,
    href: "/admin/reviews?tab=productMatches",
    load: () => count(prisma.productMatch.count({ where: { status: "NEW", reviewedAt: null } })),
  },
  {
    kind: "evidence",
    roles: REVIEW_ROLES,
    href: "/admin/reviews?tab=evidence",
    load: () => count(prisma.evidence.count({ where: { approvedStatus: "PENDING" } })),
  },
  {
    kind: "corrections",
    roles: REVIEW_ROLES,
    href: "/admin/reviews?tab=corrections",
    load: () => count(prisma.correction.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } })),
  },
  {
    kind: "inbox",
    roles: ALL_ROLES,
    href: "/admin/inbox",
    load: () => count(prisma.publicSubmission.count({ where: { status: "NEW" } })),
  },
  {
    kind: "articles",
    roles: ARTICLE_ROLES,
    href: "/admin/articles",
    load: () => count(prisma.article.count({ where: { status: { not: "PUBLISHED" } } })),
  },
  {
    kind: "siteOffers",
    roles: CATALOGUE_ROLES,
    href: DASHBOARD_HREF,
    load: async () => {
      const policies = await prisma.deliveryPolicy.groupBy({ by: ["providerId"], where: { status: "PENDING" }, _count: { _all: true } });
      const discounts = await prisma.discount.groupBy({ by: ["providerId"], where: { status: "PENDING", scraped: true, providerId: { not: null } }, _count: { _all: true } });
      return byPharmacy(policies, discounts);
    },
  },
  {
    kind: "priceChecks",
    roles: CATALOGUE_ROLES,
    href: DASHBOARD_HREF,
    load: async () => {
      const matches = await prisma.productMatch.groupBy({
        by: ["providerId"],
        where: { status: "CONFIRMED", lastScrapeStatus: { in: ["FAILED", "HUMAN_VERIFICATION_REQUIRED", "NEEDS_REVIEW"] }, provider: { status: { not: "ARCHIVED" } } },
        _count: { _all: true },
      });
      return byPharmacy(matches);
    },
  },
  {
    kind: "draftPrices",
    roles: CATALOGUE_ROLES,
    href: DASHBOARD_HREF,
    // Only pharmacies that are themselves published: a draft price elsewhere can't go public yet.
    load: async () => {
      const offers = await prisma.offer.groupBy({ by: ["providerId"], where: { publishedAt: null, provider: { status: "PUBLISHED" } }, _count: { _all: true } });
      return byPharmacy(offers);
    },
  },
];

// What is waiting on the signed-in staff member, for the header bell and the dashboard. Kinds
// with nothing pending are left out.
export async function getPendingWork(): Promise<PendingWorkItem[]> {
  const staffUser = await getStaffUser();
  if (!staffUser) return [];

  const visible = sources.filter((source) => source.roles.includes(staffUser.role));
  const loaded = await Promise.all(visible.map((source) => source.load()));
  return visible.flatMap((source, index) => {
    const { count: pending, pharmacies } = loaded[index];
    if (pending === 0) return [];
    const href = pharmacies?.length === 1 ? `/admin/pharmacies/${pharmacies[0].id}` : source.href;
    return [{ kind: source.kind, count: pending, href, pharmacies }];
  });
}
