"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { createProviderSchema } from "@/actions/providers/provider-schema";
import { createProviderRecord, type CreateProviderState } from "@/actions/providers/providers";
import type { DiscoveryCandidate, ProviderIdentifierType } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

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

  let providerId: string;
  try {
    providerId = await prisma.$transaction(async (tx) => {
      const provider = await createProviderRecord(tx, parsed.data);

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
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002") {
      return { error: "A provider with this website domain already exists." };
    }
    throw error;
  }

  await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "Provider", entityId: providerId, changes: { fromDiscoveryCandidateId: candidateId } });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "DiscoveryCandidate", entityId: candidateId, changes: { status: "PROMOTED", providerId } });

  revalidatePath("/admin/reviews");
  revalidatePath("/admin/pharmacies");
  redirect(`/admin/pharmacies/${providerId}`);
}

export type LinkDiscoveryCandidateState = { error?: string };

// A hard-identifier match is only ever a suggestion (identifier-match.ts) — this is the one place
// that actually persists a ProviderIdentifier for a LINKED_EXISTING candidate, and it's always a
// deliberate staff click, never automatic.
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
      where: { id: candidateId },
      data: { status: "LINKED_EXISTING", matchedProviderId: providerId, reviewedByStaffId: staffUser.id, reviewedAt: new Date() },
    });
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "DiscoveryCandidate", entityId: candidateId, changes: { linkedProviderId: providerId } });

  revalidatePath("/admin/reviews");
  revalidatePath(`/admin/pharmacies/${providerId}`);
  return {};
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
