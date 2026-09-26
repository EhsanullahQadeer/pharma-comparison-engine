import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const outputDir = path.join(__dirname, "..", "db-dump");

async function main() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const tables = [
    "Provider",
    "ProductVariant",
    "Offer",
    "Discount",
    "Evidence",
    "PriceHistory",
    "Article",
    "Correction",
    "ReferralClick",
    "AuditLog",
    "DiscoverySource",
    "DiscoveryRun",
    "DiscoveryCandidate",
    "ProviderIdentifier",
    "ProductMatch",
    "PriceCollectionJob",
  ];

  const summary: Record<string, number> = {};

  for (const table of tables) {
    const modelKey = table.charAt(0).toLowerCase() + table.slice(1);
    const prismaModel = (prisma as any)[modelKey];

    if (!prismaModel || typeof prismaModel.findMany !== "function") {
      console.warn(`Skipping ${table}: model not found on PrismaClient`);
      continue;
    }

    console.log(`Dumping ${table}...`);
    const data = await prismaModel.findMany();
    const filePath = path.join(outputDir, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    summary[table] = data.length;
    console.log(`  -> ${data.length} rows written to ${table}.json`);
  }

  console.log("\n--- Dump Summary ---");
  console.table(summary);
  console.log(`Total tables dumped: ${Object.keys(summary).length}`);
  console.log(`Output directory: ${outputDir}`);
}

main()
  .catch((e) => {
    console.error("Dump failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
