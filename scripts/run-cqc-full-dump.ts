import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { toCandidateAuditRecord } from "./lib/candidate-audit-record";
import { PrismaClient } from "../src/generated/prisma/client";
import { runSource } from "../src/lib/discovery/run-source";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// A single live CQC run written to one flat file — unlike run-all-discovery-sources.ts/
// dump-discovery-candidates.ts, this doesn't nest output under a new per-run timestamped folder;
// the CQC adapter already pages through the entire provider register internally (see cqc.ts), so
// this file is already the complete result of that scan, not one page of it.
async function main() {
  const source = await prisma.discoverySource.findUniqueOrThrow({ where: { type: "CQC" } });
  console.log("Running CQC...");
  const run = await runSource(source);
  if (run.status !== "SUCCESS") {
    console.log(`FAILED: ${run.errorMessage}`);
    process.exitCode = 1;
    return;
  }

  const candidates = await prisma.discoveryCandidate.findMany({ where: { lastSeenRunId: run.id } });
  const records = candidates.map(toCandidateAuditRecord);

  const outDir = join(process.cwd(), "tmp", "discovery-audit");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "cqc-full.json");
  writeFileSync(outPath, JSON.stringify(records, null, 2), "utf-8");
  console.log(`CQC: ${records.length} candidates -> ${outPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
