import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { toCandidateAuditRecord } from "./lib/candidate-audit-record";
import { PrismaClient } from "../src/generated/prisma/client";
import { discoverySourceTypeLabels } from "../src/lib/discovery-labels";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Sorted by normalized postcode+name within each file so likely-matching records sit near each
// other when eyeballing a single provider's own list, and so the same pharmacy lands at a
// comparable position across the different providers' files. This is a manual-audit aid only —
// nothing here writes back to the database or links/merges anything.
function normalize(value: string | null): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  const candidates = await prisma.discoveryCandidate.findMany({
    include: { source: { select: { type: true } } },
  });

  const bySource = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const group = bySource.get(candidate.source.type);
    if (group) group.push(candidate);
    else bySource.set(candidate.source.type, [candidate]);
  }

  const runDir = join(process.cwd(), "tmp", "discovery-audit", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(runDir, { recursive: true });

  for (const [sourceType, group] of bySource) {
    const sorted = [...group].sort((a, b) => {
      const keyA = `${normalize(a.postcode)}|${normalize(a.name)}`;
      const keyB = `${normalize(b.postcode)}|${normalize(b.name)}`;
      return keyA.localeCompare(keyB);
    });

    const records = sorted.map(toCandidateAuditRecord);

    const outPath = join(runDir, `${sourceType.toLowerCase()}.json`);
    writeFileSync(outPath, JSON.stringify(records, null, 2), "utf-8");
    console.log(`${discoverySourceTypeLabels[sourceType as keyof typeof discoverySourceTypeLabels]}: ${records.length} candidates -> ${outPath}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
