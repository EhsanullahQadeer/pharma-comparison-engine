import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Wipes all discovery-run history/candidates and resets every source's lastRunAt/nextRunAt to null
// so the next "Run now" (or cron tick) behaves like each source's very first run — adapters treat a
// null lastRunAt as "no baseline yet" (see DiscoveryAdapterContext.lastRunAt) and the cron route
// treats a null nextRunAt as immediately due. Leaves DiscoverySource config/credentials untouched.
async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const candidates = await tx.discoveryCandidate.deleteMany({});
    const runs = await tx.discoveryRun.deleteMany({});
    const sources = await tx.discoverySource.updateMany({
      data: { lastRunAt: null, nextRunAt: null },
    });
    return { candidates: candidates.count, runs: runs.count, sources: sources.count };
  });

  console.log(`Deleted ${result.candidates} candidates and ${result.runs} runs.`);
  console.log(`Reset ${result.sources} sources to first-use state (lastRunAt/nextRunAt cleared).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
