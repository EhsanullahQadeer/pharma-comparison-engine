import type { ProviderIdentifierType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { NormalizedCandidate } from "@/types/discovery";

// Fixed priority order, not a scored match — an exact hit on any one of these is the whole "is this
// a duplicate" check (research-review doc explicitly rejects fuzzy/scored auto-merge). Returns a
// *suggested* provider id only; run-source.ts never writes a ProviderIdentifier or touches the
// Provider itself — that stays a deliberate staff action in the review queue.
const identifierPriority: { type: ProviderIdentifierType; field: keyof Pick<NormalizedCandidate, "companyNumber" | "cqcLocationId" | "odsCode" | "gphcNumber"> }[] = [
  { type: "COMPANY_NUMBER", field: "companyNumber" },
  { type: "CQC_LOCATION_ID", field: "cqcLocationId" },
  { type: "ODS_CODE", field: "odsCode" },
  { type: "GPHC_NUMBER", field: "gphcNumber" },
];

export async function findMatchingProvider(
  candidate: Pick<NormalizedCandidate, "companyNumber" | "cqcLocationId" | "odsCode" | "gphcNumber">,
): Promise<string | null> {
  for (const { type, field } of identifierPriority) {
    const value = candidate[field];
    if (!value) continue;

    const match = await prisma.providerIdentifier.findUnique({
      where: { identifierType_value: { identifierType: type, value } },
      select: { providerId: true },
    });
    if (match) return match.providerId;
  }

  return null;
}
