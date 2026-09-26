"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { createProviderSchema } from "@/actions/providers/provider-schema";
import type { Prisma, ProviderStatus } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getAllowedNextStatuses } from "@/lib/provider-status-transitions";
import { revalidatePublicSite } from "@/lib/revalidate-public-site";
import { requireStaffRole } from "@/lib/staff-auth";

import type { z } from "zod";

export type CreateProviderState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof createProviderSchema>, string[]>>;
};

// Shared by createProvider (top-level prisma) and promoteDiscoveryCandidate (inside its own
// $transaction) so provider-creation logic isn't duplicated. Throws Prisma's raw P2002 on a
// duplicate websiteDomain — callers translate that into a field-level error.
export async function createProviderRecord(tx: Prisma.TransactionClient, data: z.infer<typeof createProviderSchema>) {
  const { serviceRegions, ...rest } = data;
  return tx.provider.create({
    data: {
      ...rest,
      serviceRegions: serviceRegions
        .split(",")
        .map((region) => region.trim())
        .filter(Boolean),
    },
  });
}

// Staff-facing manual entry — new providers always land as DISCOVERED (M3b state machine); staff
// promote them through identity/catalogue verification separately, never auto-published.
export async function createProvider(_prevState: CreateProviderState, formData: FormData): Promise<CreateProviderState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to add providers." };
  }

  const parsed = createProviderSchema.safeParse({
    legalName: formData.get("legalName"),
    tradingName: formData.get("tradingName"),
    websiteDomain: formData.get("websiteDomain"),
    regulatorType: formData.get("regulatorType"),
    regulatorReference: formData.get("regulatorReference"),
    dispensingPartnerName: formData.get("dispensingPartnerName") || undefined,
    serviceRegions: formData.get("serviceRegions"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  let provider;
  try {
    provider = await createProviderRecord(prisma, parsed.data);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return { error: "A provider with this website domain already exists." };
    }
    throw error;
  }

  await recordAuditLog({
    actorId: staffUser.id,
    action: "CREATE",
    entityType: "Provider",
    entityId: provider.id,
    changes: { legalName: provider.legalName, tradingName: provider.tradingName, websiteDomain: provider.websiteDomain },
  });

  revalidatePath("/admin/pharmacies");
  redirect("/admin/pharmacies");
}

export async function getProviders(search?: string, take?: number) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  const query = search?.trim();
  return prisma.provider.findMany({
    where: query
      ? {
          OR: [
            { tradingName: { contains: query, mode: "insensitive" } },
            { legalName: { contains: query, mode: "insensitive" } },
            { websiteDomain: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      tradingName: true,
      legalName: true,
      websiteDomain: true,
      regulatorType: true,
      status: true,
      serviceRegions: true,
      regulatorReference: true,
      dispensingPartnerName: true,
      logoUrl: true,
      createdAt: true,
      // Draft (unpublished) prices only — drives "Publish draft prices" on the Pharmacies list.
      _count: { select: { offers: { where: { publishedAt: null } } } },
    },
  });
}

export async function getProviderStatusCounts() {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  const grouped = await prisma.provider.groupBy({ by: ["status"], _count: { _all: true } });
  return grouped.map((entry) => ({ status: entry.status, count: entry._count._all }));
}

export async function getProvider(id: string) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      offers: {
        orderBy: { createdAt: "desc" },
        include: { productVariant: true, discounts: true, productMatch: { select: { id: true } } },
      },
      evidence: { orderBy: { createdAt: "desc" }, take: 10 },
      corrections: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!provider) notFound();
  return provider;
}

const updateProviderSchema = createProviderSchema;

export type UpdateProviderState = CreateProviderState;

export async function updateProvider(id: string, _prevState: UpdateProviderState, formData: FormData): Promise<UpdateProviderState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to edit providers." };
  }

  const parsed = updateProviderSchema.safeParse({
    legalName: formData.get("legalName"),
    tradingName: formData.get("tradingName"),
    websiteDomain: formData.get("websiteDomain"),
    regulatorType: formData.get("regulatorType"),
    regulatorReference: formData.get("regulatorReference"),
    dispensingPartnerName: formData.get("dispensingPartnerName") || undefined,
    serviceRegions: formData.get("serviceRegions"),
    logoUrl: formData.get("logoUrl") ?? undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { serviceRegions, ...rest } = parsed.data;

  let provider;
  try {
    provider = await prisma.provider.update({
      where: { id },
      data: {
        ...rest,
        serviceRegions: serviceRegions
          .split(",")
          .map((region) => region.trim())
          .filter(Boolean),
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return { error: "A provider with this website domain already exists." };
    }
    throw error;
  }

  await recordAuditLog({
    actorId: staffUser.id,
    action: "UPDATE",
    entityType: "Provider",
    entityId: provider.id,
    changes: { legalName: provider.legalName, tradingName: provider.tradingName, websiteDomain: provider.websiteDomain },
  });

  revalidatePath(`/admin/pharmacies/${id}`);
  revalidatePath("/admin/pharmacies");
  redirect(`/admin/pharmacies/${id}`);
}

export type TransitionProviderStatusState = { error?: string };

// Validated against the state machine in provider-status-transitions.ts — never a raw enum write.
export async function transitionProviderStatus(
  providerId: string,
  nextStatus: ProviderStatus,
): Promise<TransitionProviderStatusState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to change a provider's status." };
  }

  const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { status: true } });
  if (!provider) return { error: "Provider not found." };

  const allowed = getAllowedNextStatuses(provider.status, staffUser.role);
  if (!allowed.includes(nextStatus)) {
    return { error: `Cannot move a provider from ${provider.status} to ${nextStatus}.` };
  }

  await prisma.provider.update({ where: { id: providerId }, data: { status: nextStatus } });

  await recordAuditLog({
    actorId: staffUser.id,
    action: "UPDATE",
    entityType: "Provider",
    entityId: providerId,
    changes: { status: { from: provider.status, to: nextStatus } },
  });

  revalidateProviderStatusPages([providerId]);
  return {};
}

export type SetProviderLinkedState = { error?: string };

// Affiliate approval decides only whether public pages link to the pharmacy's website; it never
// changes whether or where the pharmacy is listed. A commercial decision, so commercial roles only.
export async function setProviderAffiliateApproved(providerId: string, approved: boolean): Promise<SetProviderLinkedState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["COMMERCIAL_MANAGER", "ADMINISTRATOR"]);
  } catch {
    return { error: "Only commercial managers and administrators can change website links." };
  }

  const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { affiliateApproved: true } });
  if (!provider) return { error: "Provider not found." };
  if (provider.affiliateApproved === approved) return {};

  await prisma.provider.update({ where: { id: providerId }, data: { affiliateApproved: approved } });

  await recordAuditLog({
    actorId: staffUser.id,
    action: "UPDATE",
    entityType: "Provider",
    entityId: providerId,
    changes: { affiliateApproved: { from: provider.affiliateApproved, to: approved } },
  });

  revalidateProviderStatusPages([providerId]);
  return {};
}

function revalidateProviderStatusPages(providerIds: string[]) {
  providerIds.forEach((id) => revalidatePath(`/admin/pharmacies/${id}`));
  revalidatePath("/admin/pharmacies");
  revalidatePath("/admin");
  // Entering or leaving PUBLISHED changes what the public directory and comparison pages show.
  revalidatePublicSite();
}

export type BulkTransitionProviderStatusState = { error?: string; updated?: number; skipped?: number };

// Bulk form of transitionProviderStatus: each pharmacy still goes through the state machine, so
// ones that can't make this move from where they are (e.g. skipping a verification step) are
// skipped and counted rather than failing the whole selection.
export async function transitionProviderStatuses(providerIds: string[], nextStatus: ProviderStatus): Promise<BulkTransitionProviderStatusState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to change a provider's status." };
  }

  const ids = [...new Set(providerIds.filter(Boolean))];
  if (ids.length === 0) return { error: "Select at least one pharmacy." };
  if (ids.length > 500) return { error: "Select 500 pharmacies or fewer." };

  const role = staffUser.role;
  const moved = await prisma.$transaction(async (tx) => {
    const providers = await tx.provider.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } });
    const eligible = providers.filter((provider) => getAllowedNextStatuses(provider.status, role).includes(nextStatus));
    if (eligible.length > 0) {
      await tx.provider.updateMany({ where: { id: { in: eligible.map((provider) => provider.id) } }, data: { status: nextStatus } });
    }
    return eligible;
  });

  await Promise.all(moved.map((provider) => recordAuditLog({
    actorId: staffUser.id,
    action: "UPDATE",
    entityType: "Provider",
    entityId: provider.id,
    changes: { status: { from: provider.status, to: nextStatus }, bulk: true },
  })));

  if (moved.length > 0) revalidateProviderStatusPages(moved.map((provider) => provider.id));
  return { updated: moved.length, skipped: ids.length - moved.length };
}
