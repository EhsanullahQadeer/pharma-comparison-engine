import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import * as fs from "fs";
import * as path from "path";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "db-dump", "ProductVariant.json"), "utf-8")
  );

  const result = await prisma.productVariant.createMany({
    data: data.map((row: any) => ({
      id: row.id,
      ingredient: row.ingredient,
      brandName: row.brandName,
      strengthMg: row.strengthMg,
      formulation: row.formulation,
      packQuantity: row.packQuantity,
      supplyClassification: row.supplyClassification,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${result.count} ProductVariant rows`);
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
