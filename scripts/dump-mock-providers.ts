import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Audit-only, same pattern as dump-discovery-candidates.ts — lists the current Provider table
// (currently 100% faker-generated dev seed data from prisma/seed.ts, e.g. fake domains like
// "glittering-fedora.net") so it can be reviewed before real, price-scraping-ready providers are
// seeded alongside/in place of it. Writes nothing back to the database.
async function main() {
  const providers = await prisma.provider.findMany({
    orderBy: { createdAt: "asc" },
    include: { identifiers: true, discoveryCandidates: { select: { id: true, sourceId: true } } },
  });

  const runDir = join(process.cwd(), "tmp", "provider-audit", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(runDir, { recursive: true });

  const outPath = join(runDir, "providers.json");
  writeFileSync(outPath, JSON.stringify(providers, null, 2), "utf-8");

  console.log(`${providers.length} providers -> ${outPath}`);
  for (const provider of providers) {
    console.log(`- [${provider.status}] ${provider.tradingName} (${provider.websiteDomain}) — ${provider.regulatorType} ${provider.regulatorReference}`);
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
