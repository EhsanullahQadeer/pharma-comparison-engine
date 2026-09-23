import "dotenv/config";
import { readFileSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { detectEdProductMatches } from "../src/lib/product-detection/detect-products";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const defaultAuditPath = "tmp/discovery-product-listings/2026-09-22T13-14-49-932Z/results.json";

type ProductListingAudit = { productListings: { candidateId: string }[] };

async function main() {
  const auditPath = process.argv[2] ?? defaultAuditPath;
  const audit = JSON.parse(readFileSync(auditPath, "utf8")) as ProductListingAudit;
  const candidateIds = audit.productListings.map(record => record.candidateId);
  const [reviewer, candidates] = await Promise.all([
    prisma.staffUser.findFirst({ where: { role: "ADMINISTRATOR" }, select: { id: true } }),
    prisma.discoveryCandidate.findMany({
      where: { id: { in: candidateIds }, status: "PROMOTED", matchedProviderId: { not: null } },
      select: { name: true, matchedProviderId: true, matchedProvider: { select: { websiteDomain: true } } },
    }),
  ]);
  if (!reviewer) throw new Error("No administrator account is available to record product detection.");

  const results: Record<string, { candidatesSeen?: number; newMatches?: number; error?: string }> = {};
  for (const candidate of candidates) {
    const providerId = candidate.matchedProviderId;
    const websiteDomain = candidate.matchedProvider?.websiteDomain;
    if (!providerId || !websiteDomain) continue;
    try {
      const detected = await detectEdProductMatches(websiteDomain);
      let newMatches = 0;
      for (const match of detected) {
        const existing = await prisma.productMatch.findUnique({
          where: { providerId_candidateUrl: { providerId, candidateUrl: match.candidateUrl } },
          select: { id: true, status: true },
        });
        if (!existing) {
          await prisma.productMatch.create({
            data: {
              providerId,
              candidateUrl: match.candidateUrl,
              matchedIngredient: match.ingredient,
              matchedTokens: match.matchedTokens,
              confidence: match.confidence,
            },
          });
          newMatches++;
        } else if (existing.status === "NEW") {
          await prisma.productMatch.update({
            where: { id: existing.id },
            data: { matchedIngredient: match.ingredient, matchedTokens: match.matchedTokens, confidence: match.confidence },
          });
        }
      }
      await prisma.auditLog.create({
        data: {
          actorId: reviewer.id,
          action: "CREATE",
          entityType: "ProductMatch",
          entityId: providerId,
          changes: { candidatesSeen: detected.length, newMatches, collection: "audited-provider-batch" },
        },
      });
      results[candidate.name] = { candidatesSeen: detected.length, newMatches };
    } catch (error) {
      results[candidate.name] = { error: error instanceof Error ? error.message : "Product detection failed." };
    }
  }
  const totals = { providers: 0, candidatesSeen: 0, newMatches: 0, failed: 0 };
  for (const result of Object.values(results)) {
    totals.providers++;
    totals.candidatesSeen += result.candidatesSeen ?? 0;
    totals.newMatches += result.newMatches ?? 0;
    totals.failed += Number(Boolean(result.error));
  }
  process.stdout.write(JSON.stringify({ totals, results }, null, 2) + "\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
