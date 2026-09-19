import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { toCandidateAuditRecord } from "./lib/candidate-audit-record";
import { PrismaClient } from "../src/generated/prisma/client";
import { runSource } from "../src/lib/discovery/run-source";
import { discoverySourceTypeLabels } from "../src/lib/discovery-labels";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Calls the same orchestration production uses (staff "Run now" / cron) for every enabled source in
// turn, sequentially — not parallel, since GPhC drives a real headless browser and the others are
// rate-limited external APIs. Each adapter now pages through its full result set (no PAGE_LIMIT
// cap left unpaginated — see nhs-ods.ts/nhsbsa-contractor-details.ts). After each run, dumps that
// source's touched candidates (full rawPayload included) to its own JSON file for manual audit.
async function main() {
  // Matches runDiscoverySourceNow's own "Run now" scope, not the cron route's `enabled: true` gate —
  // a source disabled for cron can still be run on demand.
  const sources = await prisma.discoverySource.findMany({ where: { type: { not: "MANUAL_WEB" } } });
  if (sources.length === 0) {
    console.log("No discovery sources found.");
    return;
  }

  const runDir = join(process.cwd(), "tmp", "discovery-audit", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(runDir, { recursive: true });

  for (const source of sources) {
    const label = discoverySourceTypeLabels[source.type];
    console.log(`Running ${label}...`);
    const run = await runSource(source);

    if (run.status !== "SUCCESS") {
      console.log(`  ${label} FAILED: ${run.errorMessage}`);
      continue;
    }

    const candidates = await prisma.discoveryCandidate.findMany({
      where: { lastSeenRunId: run.id },
      orderBy: { discoveredAt: "desc" },
    });

    const records = candidates.map(toCandidateAuditRecord);

    const outPath = join(runDir, `${source.type.toLowerCase()}.json`);
    writeFileSync(outPath, JSON.stringify(records, null, 2), "utf-8");
    console.log(`  ${label}: ${records.length} candidates -> ${outPath}`);
  }

  console.log(`\nAll files written to: ${runDir}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
