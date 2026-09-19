"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DiscoveryCadence, DiscoverySourceType } from "@/generated/prisma/client";
import type { DiscoveryCandidateStatus, DiscoveryRunStatus, Prisma } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { resolveCredentialUpdate } from "@/lib/discovery/merge-credentials";
import { runSource } from "@/lib/discovery/run-source";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

// Admin-configurable cadence per client instruction — fetch frequency is a setting, not a
// hardcoded cron. Excludes credentialsCiphertext from the result on purpose: the list/edit UI only
// ever needs configuredCredentialKeys (key *names*) to show "configured"/"not set" badges, never
// the encrypted blob itself.
export async function getDiscoverySources() {
  await requireStaffRole(["ADMINISTRATOR"]);
  return prisma.discoverySource.findMany({
    where: { type: { not: "MANUAL_WEB" } },
    orderBy: { type: "asc" },
    select: {
      id: true,
      type: true,
      enabled: true,
      cadence: true,
      lastRunAt: true,
      nextRunAt: true,
      configuredCredentialKeys: true,
      createdAt: true,
      updatedAt: true,
      runs: { orderBy: { startedAt: "desc" }, take: 1 },
    },
  });
}

// Source types that don't have a row yet — drives the "Add source" create form. A brand-new type
// still needs real adapter code (src/lib/discovery/adapters/registry.ts) before it can actually run;
// this just means the admin config side (cadence/credentials) doesn't also need a seed-script edit.
export async function getAvailableDiscoverySourceTypesForCreate(): Promise<DiscoverySourceType[]> {
  await requireStaffRole(["ADMINISTRATOR"]);
  const existing = await prisma.discoverySource.findMany({ select: { type: true } });
  const existingTypes = new Set(existing.map((source) => source.type));
  return Object.values(DiscoverySourceType).filter((type) => type !== "MANUAL_WEB" && !existingTypes.has(type));
}

const updateDiscoverySourceSchema = z.object({
  cadence: z.enum(DiscoveryCadence),
  enabled: z.boolean(),
});

export type UpdateDiscoverySourceState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof updateDiscoverySourceSchema>, string[]>>;
};

export async function updateDiscoverySource(
  id: string,
  _prevState: UpdateDiscoverySourceState,
  formData: FormData,
): Promise<UpdateDiscoverySourceState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to manage discovery sources." };
  }

  const parsed = updateDiscoverySourceSchema.safeParse({
    cadence: formData.get("cadence"),
    enabled: formData.get("enabled") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const existing = await prisma.discoverySource.findUnique({ where: { id }, select: { type: true, credentialsCiphertext: true } });
  if (!existing) return { error: "Discovery source not found." };

  const credentialUpdate = resolveCredentialUpdate(existing.type, formData, existing.credentialsCiphertext);

  const updated = await prisma.discoverySource.update({
    where: { id },
    data: { ...parsed.data, ...credentialUpdate },
  });

  await recordAuditLog({
    actorId: staffUser.id,
    action: "UPDATE",
    entityType: "DiscoverySource",
    entityId: updated.id,
    // Never the actual key values — only whether credentials were touched this call.
    changes: { cadence: updated.cadence, enabled: updated.enabled, credentialsUpdated: credentialUpdate !== null },
  });

  revalidatePath("/admin/discovery-sources");
  return {};
}

const createDiscoverySourceSchema = z.object({
  type: z.enum(DiscoverySourceType),
  cadence: z.enum(DiscoveryCadence),
  enabled: z.boolean(),
});

export type CreateDiscoverySourceState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof createDiscoverySourceSchema>, string[]>>;
};

export async function createDiscoverySource(_prevState: CreateDiscoverySourceState, formData: FormData): Promise<CreateDiscoverySourceState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to manage discovery sources." };
  }

  const parsed = createDiscoverySourceSchema.safeParse({
    type: formData.get("type"),
    cadence: formData.get("cadence"),
    enabled: formData.get("enabled") === "on",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const credentialUpdate = resolveCredentialUpdate(parsed.data.type, formData, null);

  let created;
  try {
    created = await prisma.discoverySource.create({ data: { ...parsed.data, ...credentialUpdate } });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return { error: "A discovery source of this type already exists." };
    }
    throw error;
  }

  await recordAuditLog({
    actorId: staffUser.id,
    action: "CREATE",
    entityType: "DiscoverySource",
    entityId: created.id,
    changes: { type: created.type, cadence: created.cadence, enabled: created.enabled, credentialsUpdated: credentialUpdate !== null },
  });

  revalidatePath("/admin/discovery-sources");
  return {};
}

export type DiscoveryRunResultCandidate = {
  id: string;
  name: string;
  postcode: string | null;
  websiteDomain: string | null;
  companyNumber: string | null;
  cqcLocationId: string | null;
  odsCode: string | null;
  gphcNumber: string | null;
  status: DiscoveryCandidateStatus;
  // The untouched source API response for this candidate, exactly as the adapter received it —
  // lets staff inspect what the source actually sent back, not just our normalized columns.
  rawPayload: Prisma.JsonValue;
};

export type RunDiscoverySourceNowState = {
  error?: string;
  result?: {
    runId: string;
    status: DiscoveryRunStatus | null;
    candidatesFound: number;
    errorMessage: string | null;
    // The primary request the adapter made, secrets shown as "{name}" placeholders — never a real
    // value. Absent when the run failed before making any request (e.g. no key configured).
    requestSummary: string | null;
    candidates: DiscoveryRunResultCandidate[];
  };
};

// Manual fallback that works regardless of the cron trigger's schedule/plan limits — calls the
// same orchestration (run-source.ts) the route handler uses, just staff-triggered. Also fetches
// the candidates that run actually touched (lastSeenRunId) so the admin screen can show the result
// as a table right below, in the same round trip.
export async function runDiscoverySourceNow(sourceId: string): Promise<RunDiscoverySourceNowState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to run discovery sources." };
  }

  const source = await prisma.discoverySource.findUnique({ where: { id: sourceId } });
  if (!source) return { error: "Discovery source not found." };

  const run = await runSource(source, { triggeredByStaffId: staffUser.id });
  const candidates = await prisma.discoveryCandidate.findMany({
    where: { lastSeenRunId: run.id },
    orderBy: { discoveredAt: "desc" },
    select: {
      id: true,
      name: true,
      postcode: true,
      websiteDomain: true,
      companyNumber: true,
      cqcLocationId: true,
      odsCode: true,
      gphcNumber: true,
      status: true,
      rawPayload: true,
    },
  });

  revalidatePath("/admin/discovery-sources");
  return {
    result: {
      runId: run.id,
      status: run.status,
      candidatesFound: run.candidatesFound,
      errorMessage: run.errorMessage,
      requestSummary: run.requestSummary,
      candidates,
    },
  };
}
