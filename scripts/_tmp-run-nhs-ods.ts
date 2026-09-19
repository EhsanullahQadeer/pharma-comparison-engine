import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { toCandidateAuditRecord } from "./lib/candidate-audit-record";
import { PrismaClient } from "../src/generated/prisma/client";
import { runSource } from "../src/lib/discovery/run-source";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const source = await prisma.discoverySource.findUniqueOrThrow({ where: { type: "NHS_ODS" } });
  console.log("Running NHS ODS...");
  const run = await runSource(source);
  if (run.status !== "SUCCESS") {
    console.log(`FAILED: ${run.errorMessage}`);
    process.exitCode = 1;
    return;
  }

  const candidates = await prisma.discoveryCandidate.findMany({ where: { lastSeenRunId: run.id } });
  const records = candidates.map(toCandidateAuditRecord);

  const outDir = join(process.cwd(), "tmp", "discovery-audit", "final");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "nhs_ods.json");
  writeFileSync(outPath, JSON.stringify(records, null, 2), "utf-8");
  console.log(`NHS ODS: ${records.length} candidates -> ${outPath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
