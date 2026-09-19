import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runSource } from "../src/lib/discovery/run-source";
import { prisma } from "../src/lib/prisma";

async function main() {
  const directory = join(process.cwd(), "tmp/discovery-audit", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(directory, { recursive: true });
  const candidates = await prisma.discoveryCandidate.findMany();
  const backup = join(directory, "discovery-candidates-backup.json");
  const serialized = JSON.stringify(candidates, null, 2);
  writeFileSync(backup, serialized, { encoding: "utf8", flag: "wx" });
  if (readFileSync(backup, "utf8") !== serialized) throw new Error("Backup verification failed; nothing deleted.");
  process.stdout.write(`Verified backup: ${backup} (${candidates.length} rows)\n`);
  // Delete only the exported rows. Preserve run history and all source configuration.
  const removed = await prisma.discoveryCandidate.deleteMany({ where: { id: { in: candidates.map(row => row.id) } } });
  process.stdout.write(`Cleared ${removed.count} exported candidates.\n`);
  const source = await prisma.discoverySource.findUniqueOrThrow({ where: { type: "GPHC" } });
  const run = await runSource({ ...source, lastRunAt: null });
  writeFileSync(join(directory, "gphc-run.json"), JSON.stringify(run, null, 2));
  process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
  if (run.status !== "SUCCESS") process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
