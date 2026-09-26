import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Deleting all data except StaffUser and DiscoverySource...\n");

  const deletes = [
    { name: "PriceCollectionJob", fn: () => prisma.priceCollectionJob.deleteMany() },
    { name: "ProductMatch", fn: () => prisma.productMatch.deleteMany() },
    { name: "ReferralClick", fn: () => prisma.referralClick.deleteMany() },
    { name: "PriceHistory", fn: () => prisma.priceHistory.deleteMany() },
    { name: "Evidence", fn: () => prisma.evidence.deleteMany() },
    { name: "Discount", fn: () => prisma.discount.deleteMany() },
    { name: "Offer", fn: () => prisma.offer.deleteMany() },
    { name: "Correction", fn: () => prisma.correction.deleteMany() },
    { name: "AuditLog", fn: () => prisma.auditLog.deleteMany() },
    { name: "ProviderIdentifier", fn: () => prisma.providerIdentifier.deleteMany() },
    { name: "DiscoveryRun", fn: () => prisma.discoveryRun.deleteMany() },
    { name: "DiscoveryCandidate", fn: () => prisma.discoveryCandidate.deleteMany() },
    { name: "Article", fn: () => prisma.article.deleteMany() },
    { name: "ProductVariant", fn: () => prisma.productVariant.deleteMany() },
    { name: "Provider", fn: () => prisma.provider.deleteMany() },
  ];

  for (const { name, fn } of deletes) {
    const result = await fn();
    console.log(`  ${name}: ${result.count} rows deleted`);
  }

  const userCount = await prisma.staffUser.count();
  const sourceCount = await prisma.discoverySource.count();
  console.log(`\nKept: StaffUser (${userCount} rows), DiscoverySource (${sourceCount} rows)`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
