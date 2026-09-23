"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { createProviderSchema } from "@/actions/providers/provider-schema";
import { createProviderRecord, type CreateProviderState } from "@/actions/providers/providers";
import type { DiscoveryCandidate, DiscoverySourceType, ProviderIdentifierType } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

import type { z } from "zod";

// Only candidates a staff member hasn't yet acted on — reviewedAt is set the moment a candidate is
// promoted, linked or rejected, so this is the whole "still needs a decision" query. status stays
// LINKED_EXISTING after a confirmed link (see linkDiscoveryCandidateToProvider) rather than a
// separate terminal enum value, so reviewedAt is what actually drives queue membership.
export async function getDiscoveryCandidatesForReview() {
  await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  return prisma.discoveryCandidate.findMany({
    where: { status: { in: ["NEW", "LINKED_EXISTING"] }, reviewedAt: null },
    orderBy: { discoveredAt: "desc" },
    include: {
      source: { select: { type: true } },
      matchedProvider: { select: { id: true, tradingName: true } },
    },
  });
}

export async function getDiscoveryCandidateForPromotion(id: string) {
  await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  const candidate = await prisma.discoveryCandidate.findUnique({ where: { id } });
  if (!candidate || candidate.status !== "NEW") notFound();
  return candidate;
}

const identifierFields: { field: "companyNumber" | "cqcLocationId" | "odsCode" | "gphcNumber"; type: ProviderIdentifierType }[] = [
  { field: "companyNumber", type: "COMPANY_NUMBER" },
  { field: "cqcLocationId", type: "CQC_LOCATION_ID" },
  { field: "odsCode", type: "ODS_CODE" },
  { field: "gphcNumber", type: "GPHC_NUMBER" },
];

// Companies House's public profile URL is a stable, well-known pattern — used as evidence's
// sourceUrl when a candidate has no website lead of its own (CQC's website field is the only
// automated website signal in this slice; the others don't surface one).
function buildEvidenceSourceUrl(candidate: DiscoveryCandidate): string {
  if (candidate.websiteDomain) return `https://${candidate.websiteDomain}`;
  if (candidate.companyNumber) return `https://find-and-update.company-information.service.gov.uk/company/${candidate.companyNumber}`;
  return `discovery-candidate:${candidate.id}`;
}

type CandidateWithSource = DiscoveryCandidate & { source: { type: DiscoverySourceType } };

// Shared by the singular (redirecting) and bulk promote paths so the actual write logic — provider
// creation, identifier copy-over, evidence record, candidate status flip — lives in one place.
async function runCandidatePromotion(
  candidate: CandidateWithSource,
  data: z.infer<typeof createProviderSchema>,
  staffUser: { id: string },
): Promise<{ providerId: string } | { error: string }> {
  try {
    const providerId = await prisma.$transaction(async (tx) => {
      const provider = await createProviderRecord(tx, data);

      const identifierRows = identifierFields
        .filter(({ field }) => candidate[field])
        .map(({ field, type }) => ({
          providerId: provider.id,
          identifierType: type,
          value: candidate[field] as string,
          source: candidate.source.type,
        }));
      if (identifierRows.length > 0) {
        await tx.providerIdentifier.createMany({ data: identifierRows, skipDuplicates: true });
      }

      await tx.evidence.create({
        data: {
          providerId: provider.id,
          sourceUrl: buildEvidenceSourceUrl(candidate),
          retrievedAt: candidate.discoveredAt,
          checkedAt: new Date(),
          reviewerId: staffUser.id,
          approvedStatus: "APPROVED",
        },
      });

      await tx.discoveryCandidate.update({
        where: { id: candidate.id },
        data: { status: "PROMOTED", matchedProviderId: provider.id, reviewedByStaffId: staffUser.id, reviewedAt: new Date() },
      });

      return provider.id;
    });
    return { providerId };
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return { error: "A provider with this website domain already exists." };
    }
    throw error;
  }
}

// Reuses CreateProviderState/createProviderSchema/createProviderRecord from the providers domain
// rather than duplicating provider-creation logic — this is the same form as manual entry, just
// pre-filled from a discovery candidate and additionally recording ProviderIdentifier + Evidence.
export async function promoteDiscoveryCandidate(
  candidateId: string,
  _prevState: CreateProviderState,
  formData: FormData,
): Promise<CreateProviderState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to add providers." };
  }

  const candidate = await prisma.discoveryCandidate.findUnique({
    where: { id: candidateId },
    include: { source: { select: { type: true } } },
  });
  if (!candidate) return { error: "Discovery candidate not found." };
  if (candidate.reviewedAt) return { error: "This candidate has already been reviewed." };

  const parsed = createProviderSchema.safeParse({
    legalName: formData.get("legalName"),
    tradingName: formData.get("tradingName"),
    websiteDomain: formData.get("websiteDomain"),
    regulatorType: formData.get("regulatorType"),
    regulatorReference: formData.get("regulatorReference"),
    dispensingPartnerName: formData.get("dispensingPartnerName") || undefined,
    serviceRegions: formData.get("serviceRegions"),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await runCandidatePromotion(candidate, parsed.data, staffUser);
  if ("error" in result) return { error: result.error };

  await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "Provider", entityId: result.providerId, changes: { fromDiscoveryCandidateId: candidateId } });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "DiscoveryCandidate", entityId: candidateId, changes: { status: "PROMOTED", providerId: result.providerId } });

  revalidatePath("/admin/reviews");
  revalidatePath("/admin/pharmacies");
  redirect(`/admin/pharmacies/${result.providerId}`);
}

export type PromoteDiscoveryCandidateRow = {
  candidateId: string;
  legalName: string;
  tradingName: string;
  websiteDomain: string;
  regulatorType: string;
  regulatorReference: string;
  dispensingPartnerName?: string;
  serviceRegions: string;
};

export type BulkResolveResult = { succeeded: string[]; errors: Record<string, string> };

// Table-driven bulk promote (admin/reviews' editable columns) — each row carries the Provider
// fields the candidate itself doesn't have (legal/trading name, regulator, service regions), staff
// edits them inline before selecting rows. Rows are resolved independently (their own transaction
// each, via runCandidatePromotion) so one bad row — a duplicate website domain, say — doesn't stop
// the rest of the batch from promoting.
export async function promoteDiscoveryCandidatesBulk(rows: PromoteDiscoveryCandidateRow[]): Promise<BulkResolveResult | { error: string }> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to add providers." };
  }

  const succeeded: string[] = [];
  const errors: Record<string, string> = {};

  for (const row of rows) {
    const parsed = createProviderSchema.safeParse({ ...row, dispensingPartnerName: row.dispensingPartnerName || undefined });
    if (!parsed.success) {
      errors[row.candidateId] = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Check this row's fields.";
      continue;
    }

    const candidate = await prisma.discoveryCandidate.findUnique({
      where: { id: row.candidateId },
      include: { source: { select: { type: true } } },
    });
    if (!candidate) { errors[row.candidateId] = "Discovery candidate not found."; continue; }
    if (candidate.reviewedAt) { errors[row.candidateId] = "This candidate has already been reviewed."; continue; }

    const result = await runCandidatePromotion(candidate, parsed.data, staffUser);
    if ("error" in result) { errors[row.candidateId] = result.error; continue; }

    await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "Provider", entityId: result.providerId, changes: { fromDiscoveryCandidateId: row.candidateId } });
    await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "DiscoveryCandidate", entityId: row.candidateId, changes: { status: "PROMOTED", providerId: result.providerId } });
    succeeded.push(row.candidateId);
  }

  if (succeeded.length > 0) {
    revalidatePath("/admin/reviews");
    revalidatePath("/admin/pharmacies");
  }
  return { succeeded, errors };
}

export type LinkDiscoveryCandidateState = { error?: string };

// A hard-identifier match is only ever a suggestion (identifier-match.ts) — this is the one place
// that actually persists a ProviderIdentifier for a LINKED_EXISTING candidate, and it's always a
// deliberate staff click, never automatic.
async function runCandidateLink(candidate: CandidateWithSource, providerId: string, staffUser: { id: string }): Promise<{ error?: string }> {
  const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { id: true } });
  if (!provider) return { error: "Provider not found." };

  const identifierRows = identifierFields
    .filter(({ field }) => candidate[field])
    .map(({ field, type }) => ({ providerId, identifierType: type, value: candidate[field] as string, source: candidate.source.type }));

  await prisma.$transaction(async (tx) => {
    if (identifierRows.length > 0) {
      await tx.providerIdentifier.createMany({ data: identifierRows, skipDuplicates: true });
    }
    await tx.discoveryCandidate.update({
      where: { id: candidate.id },
      data: { status: "LINKED_EXISTING", matchedProviderId: providerId, reviewedByStaffId: staffUser.id, reviewedAt: new Date() },
    });
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "DiscoveryCandidate", entityId: candidate.id, changes: { linkedProviderId: providerId } });
  return {};
}

export async function linkDiscoveryCandidateToProvider(candidateId: string, providerId: string): Promise<LinkDiscoveryCandidateState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to review discovery candidates." };
  }

  const candidate = await prisma.discoveryCandidate.findUnique({
    where: { id: candidateId },
    include: { source: { select: { type: true } } },
  });
  if (!candidate) return { error: "Discovery candidate not found." };
  if (candidate.reviewedAt) return { error: "This candidate has already been reviewed." };

  const result = await runCandidateLink(candidate, providerId, staffUser);
  if (result.error) return result;

  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/pharmacies/${providerId}`);
  return {};
}

export type DiscoveryCandidateLinkRow = { candidateId: string; providerId: string };

// Companion to promoteDiscoveryCandidatesBulk for the other half of a table-driven bulk "resolve":
// rows that already carry a suggested match (matchedProvider) confirm-link instead of promoting —
// no editable fields needed, just the candidate/provider pair.
export async function linkDiscoveryCandidatesToProvidersBulk(links: DiscoveryCandidateLinkRow[]): Promise<BulkResolveResult | { error: string }> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to review discovery candidates." };
  }

  const succeeded: string[] = [];
  const errors: Record<string, string> = {};

  for (const { candidateId, providerId } of links) {
    const candidate = await prisma.discoveryCandidate.findUnique({
      where: { id: candidateId },
      include: { source: { select: { type: true } } },
    });
    if (!candidate) { errors[candidateId] = "Discovery candidate not found."; continue; }
    if (candidate.reviewedAt) { errors[candidateId] = "This candidate has already been reviewed."; continue; }

    const result = await runCandidateLink(candidate, providerId, staffUser);
    if (result.error) { errors[candidateId] = result.error; continue; }
    succeeded.push(candidateId);
  }

  if (succeeded.length > 0) revalidatePath("/admin/reviews");
  return { succeeded, errors };
}

export type RejectDiscoveryCandidateState = { error?: string };

export async function rejectDiscoveryCandidate(candidateId: string): Promise<RejectDiscoveryCandidateState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to review discovery candidates." };
  }

  const candidate = await prisma.discoveryCandidate.findUnique({ where: { id: candidateId }, select: { id: true, reviewedAt: true } });
  if (!candidate) return { error: "Discovery candidate not found." };
  if (candidate.reviewedAt) return { error: "This candidate has already been reviewed." };

  await prisma.discoveryCandidate.update({
    where: { id: candidateId },
    data: { status: "REJECTED", reviewedByStaffId: staffUser.id, reviewedAt: new Date() },
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "DiscoveryCandidate", entityId: candidateId, changes: { status: "REJECTED" } });

  revalidatePath("/admin/reviews");
  return {};
}

export async function rejectDiscoveryCandidatesBulk(candidateIds: string[]): Promise<{ error?: string; rejectedCount?: number }> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to review discovery candidates." };
  }

  const uniqueIds = [...new Set(candidateIds)];
  if (uniqueIds.length === 0) return { rejectedCount: 0 };

  const candidates = await prisma.discoveryCandidate.findMany({
    where: { id: { in: uniqueIds }, reviewedAt: null },
    select: { id: true },
  });
  if (candidates.length === 0) return { rejectedCount: 0 };

  await prisma.discoveryCandidate.updateMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    data: { status: "REJECTED", reviewedByStaffId: staffUser.id, reviewedAt: new Date() },
  });

  await Promise.all(candidates.map((c) =>
    recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "DiscoveryCandidate", entityId: c.id, changes: { status: "REJECTED" } }),
  ));

  revalidatePath("/admin/reviews");
  return { rejectedCount: candidates.length };
}
