"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { createProviderSchema } from "@/actions/providers/provider-schema";
import type { Prisma, ProviderStatus } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getAllowedNextStatuses } from "@/lib/provider-status-transitions";
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
      createdAt: true,
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

  revalidatePath(`/admin/pharmacies/${providerId}`);
  revalidatePath("/admin/pharmacies");
  revalidatePath("/admin");
  return {};
}
