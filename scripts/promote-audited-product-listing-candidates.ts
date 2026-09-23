import "dotenv/config";
import { readFileSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient, type DiscoveryCandidate, type DiscoverySourceType } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const defaultAuditPath = "tmp/discovery-product-listings/2026-09-22T13-14-49-932Z/results.json";

type ProductListingAudit = {
  productListings: { candidateId: string }[];
};

type Candidate = DiscoveryCandidate & { source: { type: DiscoverySourceType } };

function sourceUrl(candidate: Candidate) {
  return candidate.websiteDomain ? "https://" + candidate.websiteDomain : "discovery-candidate:" + candidate.id;
}

async function promote(candidate: Candidate, reviewerId: string) {
  const gphcNumber = candidate.gphcNumber;
  const websiteDomain = candidate.websiteDomain;
  if (!gphcNumber) return "missing GPhC registration";
  if (!websiteDomain) return "missing website domain";
  if (candidate.reviewedAt || candidate.status !== "NEW") return "already reviewed";
  const existingProvider = await prisma.provider.findUnique({ where: { websiteDomain }, select: { id: true } });
  if (existingProvider) return "website already belongs to a provider";

  await prisma.$transaction(async (tx) => {
    const provider = await tx.provider.create({
      data: {
        legalName: candidate.name,
        tradingName: candidate.name,
        websiteDomain,
        regulatorType: "GPHC",
        regulatorReference: gphcNumber,
        serviceRegions: ["England"],
      },
    });
    const identifiers = [
      { identifierType: "GPHC_NUMBER" as const, value: gphcNumber },
      ...(candidate.odsCode ? [{ identifierType: "ODS_CODE" as const, value: candidate.odsCode }] : []),
    ];
    await tx.providerIdentifier.createMany({
      data: identifiers.map(identifier => ({ ...identifier, providerId: provider.id, source: candidate.source.type })),
      skipDuplicates: true,
    });
    await tx.evidence.create({
      data: {
        providerId: provider.id,
        sourceUrl: sourceUrl(candidate),
        retrievedAt: candidate.discoveredAt,
        checkedAt: new Date(),
        reviewerId,
        approvedStatus: "APPROVED",
      },
    });
    await tx.discoveryCandidate.update({
      where: { id: candidate.id },
      data: {
        status: "PROMOTED",
        matchedProviderId: provider.id,
        reviewedByStaffId: reviewerId,
        reviewedAt: new Date(),
      },
    });
    await tx.auditLog.createMany({
      data: [
        { actorId: reviewerId, action: "CREATE", entityType: "Provider", entityId: provider.id, changes: { fromDiscoveryCandidateId: candidate.id, auditClassification: "PRODUCT_LISTING" } },
        { actorId: reviewerId, action: "UPDATE", entityType: "DiscoveryCandidate", entityId: candidate.id, changes: { status: "PROMOTED", providerId: provider.id } },
      ],
    });
  });
  return undefined;
}

async function main() {
  const auditPath = process.argv[2] ?? defaultAuditPath;
  const audit = JSON.parse(readFileSync(auditPath, "utf8")) as ProductListingAudit;
  const candidateIds = audit.productListings.map(record => record.candidateId);
  const [reviewer, candidates] = await Promise.all([
    prisma.staffUser.findFirst({ where: { role: "ADMINISTRATOR" }, select: { id: true } }),
    prisma.discoveryCandidate.findMany({
      where: { id: { in: candidateIds } },
      include: { source: { select: { type: true } } },
    }),
  ]);
  if (!reviewer) throw new Error("No administrator account is available to record the promotion review.");

  const promoted: string[] = [];
  const skipped: Record<string, string> = {};
  for (const candidate of candidates) {
    try {
      const reason = await promote(candidate, reviewer.id);
      if (reason) skipped[candidate.name] = reason;
      else promoted.push(candidate.name);
    } catch (error) {
      skipped[candidate.name] = error instanceof Error ? error.message : "Promotion failed.";
    }
  }
  process.stdout.write(JSON.stringify({ auditedCandidates: candidates.length, promoted: promoted.length, promotedNames: promoted, skipped }, null, 2) + "\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
