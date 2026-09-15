import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { PrismaClient, RegulatorType, type ProviderStatus } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@pharmacompare.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.staffUser.upsert({
    where: { email },
    update: {},
    create: { email, name: "Platform administrator", passwordHash, role: "ADMINISTRATOR" },
  });

  console.log(`Seeded staff administrator: ${email}`);
}

const regulatorTypes = Object.values(RegulatorType);
const providerStatuses: ProviderStatus[] = ["DISCOVERED", "DISCOVERED", "IDENTITY_VERIFIED", "PUBLISHED"];

async function seedProviders(count: number) {
  const existing = await prisma.provider.count();
  if (existing > 0) {
    console.log(`Skipping provider seed — ${existing} provider(s) already exist.`);
    return;
  }

  for (let i = 0; i < count; i += 1) {
    const tradingName = `${faker.company.name()} Pharmacy`;
    await prisma.provider.create({
      data: {
        tradingName,
        legalName: `${tradingName} Ltd`,
        websiteDomain: faker.internet.domainName(),
        regulatorType: faker.helpers.arrayElement(regulatorTypes),
        regulatorReference: faker.string.alphanumeric(8).toUpperCase(),
        serviceRegions: faker.helpers.arrayElements(["England", "Scotland", "Wales", "Northern Ireland"], { min: 1, max: 3 }),
        status: faker.helpers.arrayElement(providerStatuses),
      },
    });
  }

  console.log(`Seeded ${count} fake providers.`);
}

async function main() {
  await seedAdmin();
  await seedProviders(12);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
