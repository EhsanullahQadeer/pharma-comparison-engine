import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import {
  PrismaClient,
  RegulatorType,
  type DiscoveryCadence,
  type DiscoverySourceType,
  type ProviderStatus,
  type StaffRole,
} from "../src/generated/prisma/client";

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

const otherStaffRoles: { role: StaffRole; name: string }[] = [
  { role: "CATALOGUE_EDITOR", name: "Priya Shah" },
  { role: "CONTENT_REVIEWER", name: "Tom Okafor" },
  { role: "COMMERCIAL_MANAGER", name: "Lena Marsh" },
];

async function seedOtherStaff() {
  const existing = await prisma.staffUser.count();
  if (existing > 1) {
    console.log(`Skipping additional staff seed — ${existing} staff user(s) already exist.`);
    return;
  }

  const passwordHash = await bcrypt.hash("change-me-now", 12);
  for (const { role, name } of otherStaffRoles) {
    await prisma.staffUser.upsert({
      where: { email: `${role.toLowerCase().replace("_", ".")}@pharmacompare.local` },
      update: {},
      create: { email: `${role.toLowerCase().replace("_", ".")}@pharmacompare.local`, name, role, passwordHash },
    });
  }

  console.log(`Seeded ${otherStaffRoles.length} additional staff accounts.`);
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

const productVariantSeeds = [
  { ingredient: "SILDENAFIL", brandName: "Viagra Connect", strengthMg: 50, formulation: "Film-coated tablet", packQuantity: 4, supplyClassification: "P" },
  { ingredient: "SILDENAFIL", brandName: "Viagra", strengthMg: 100, formulation: "Film-coated tablet", packQuantity: 4, supplyClassification: "POM" },
  { ingredient: "SILDENAFIL", brandName: undefined, strengthMg: 100, formulation: "Film-coated tablet (generic)", packQuantity: 8, supplyClassification: "POM" },
  { ingredient: "TADALAFIL", brandName: "Cialis", strengthMg: 10, formulation: "Film-coated tablet", packQuantity: 4, supplyClassification: "POM" },
  { ingredient: "TADALAFIL", brandName: "Cialis", strengthMg: 20, formulation: "Film-coated tablet", packQuantity: 4, supplyClassification: "POM" },
  { ingredient: "TADALAFIL", brandName: undefined, strengthMg: 5, formulation: "Film-coated tablet (generic, daily dose)", packQuantity: 28, supplyClassification: "POM" },
] as const;

async function seedProductVariants() {
  const existing = await prisma.productVariant.count();
  if (existing > 0) {
    console.log(`Skipping product variant seed — ${existing} variant(s) already exist.`);
    return [];
  }

  const created = [];
  for (const seed of productVariantSeeds) {
    created.push(await prisma.productVariant.create({ data: seed }));
  }

  console.log(`Seeded ${created.length} product variants.`);
  return created;
}

const availabilityOptions = ["IN_STOCK", "IN_STOCK", "IN_STOCK", "OUT_OF_STOCK", "UNKNOWN"] as const;

async function seedOffersAndDiscounts(providerIds: string[], variantIds: string[]) {
  const existing = await prisma.offer.count();
  if (existing > 0) {
    console.log(`Skipping offer seed — ${existing} offer(s) already exist.`);
    return;
  }
  if (providerIds.length === 0 || variantIds.length === 0) {
    console.log("Skipping offer seed — no providers or product variants to attach offers to.");
    return;
  }

  let offerCount = 0;
  let discountCount = 0;

  for (const providerId of providerIds) {
    const offerVariants = faker.helpers.arrayElements(variantIds, { min: 1, max: 3 });
    for (const productVariantId of offerVariants) {
      const itemPricePence = faker.number.int({ min: 1500, max: 4500 });
      const deliveryFeePence = faker.helpers.arrayElement([0, 0, 295, 395]);
      const availability = faker.helpers.arrayElement(availabilityOptions);
      const retrievedAt = faker.date.recent({ days: 21 });

      const offer = await prisma.offer.create({
        data: {
          providerId,
          productVariantId,
          itemPricePence,
          deliveryFeePence,
          consultationFeePence: 0,
          otherMandatoryFeesPence: 0,
          deliveryAssumption: "1 pack, standard tracked delivery",
          availability,
          purchaseModel: "ONE_OFF",
          sourceUrl: `https://${faker.internet.domainName()}/ed/pricing`,
          retrievedAt,
        },
      });
      offerCount += 1;

      await prisma.priceHistory.create({
        data: {
          offerId: offer.id,
          itemPricePence,
          deliveryFeePence,
          consultationFeePence: 0,
          otherMandatoryFeesPence: 0,
          deliveredTotalPence: itemPricePence + deliveryFeePence,
          availability,
          effectiveFrom: retrievedAt,
        },
      });

      if (faker.datatype.boolean({ probability: 0.4 })) {
        const valuePercent = faker.helpers.arrayElement([10, 15, 20]);
        await prisma.discount.create({
          data: {
            offerId: offer.id,
            eligibility: "First-time customers",
            valueType: "PERCENT",
            valuePercent,
            stackable: false,
          },
        });
        discountCount += 1;

        // Demonstrates the offer/discount history extension (platform pivot, 2026-09-16): a
        // snapshot row with the discount's terms attached, not just a bare price change.
        await prisma.priceHistory.create({
          data: {
            offerId: offer.id,
            itemPricePence,
            deliveryFeePence,
            consultationFeePence: 0,
            otherMandatoryFeesPence: 0,
            deliveredTotalPence: itemPricePence + deliveryFeePence,
            availability,
            activeDiscountSnapshot: { eligibility: "First-time customers", valueType: "PERCENT", valuePercent, stackable: false },
            effectiveFrom: faker.date.recent({ days: 7 }),
          },
        });
      }
    }
  }

  console.log(`Seeded ${offerCount} offers (${discountCount} with a discount).`);
}

async function seedEvidenceAndCorrections(providerIds: string[]) {
  const existingEvidence = await prisma.evidence.count();
  const existingCorrections = await prisma.correction.count();
  if (existingEvidence > 0 || existingCorrections > 0) {
    console.log("Skipping evidence/correction seed — records already exist.");
    return;
  }
  if (providerIds.length === 0) return;

  const evidenceStatuses = ["PENDING", "PENDING", "APPROVED", "REJECTED"] as const;
  for (const providerId of faker.helpers.arrayElements(providerIds, { min: 3, max: 6 })) {
    await prisma.evidence.create({
      data: {
        providerId,
        sourceUrl: `https://${faker.internet.domainName()}/about-us`,
        retrievedAt: faker.date.recent({ days: 30 }),
        approvedStatus: faker.helpers.arrayElement(evidenceStatuses),
      },
    });
  }

  const issues = [
    "Listed price no longer matches what's shown at checkout.",
    "This pharmacy appears to have closed — website is down.",
    "Regulator registration number looks incorrect.",
    "Delivery fee wasn't included in the total shown.",
  ];
  for (const providerId of faker.helpers.arrayElements(providerIds, { min: 2, max: 4 })) {
    await prisma.correction.create({
      data: {
        providerId,
        reportedIssue: faker.helpers.arrayElement(issues),
        reporterEmail: faker.datatype.boolean() ? faker.internet.email() : undefined,
        status: faker.helpers.arrayElement(["OPEN", "OPEN", "IN_PROGRESS", "RESOLVED"]),
      },
    });
  }

  console.log("Seeded evidence and correction records.");
}

// Seeded once, disabled by default — an admin turns a source on once its API key is configured
// and can change cadence from the Discovery sources screen. Defaults follow the recommendation in
// docs/pharmacy-discovery-research-review.md: weekly for the three confirmed-stable sources,
// monthly for the two stubbed sources pending live-schema verification.
const discoverySourceSeeds: { type: DiscoverySourceType; cadence: DiscoveryCadence }[] = [
  { type: "COMPANIES_HOUSE", cadence: "WEEKLY" },
  { type: "CQC", cadence: "WEEKLY" },
  { type: "NHS_ODS", cadence: "WEEKLY" },
  { type: "GPHC", cadence: "MONTHLY" },
  { type: "NHSBSA_CONTRACTOR_DETAILS", cadence: "MONTHLY" },
];

async function seedDiscoverySources() {
  for (const { type, cadence } of discoverySourceSeeds) {
    await prisma.discoverySource.upsert({
      where: { type },
      update: {},
      create: { type, cadence, enabled: false },
    });
  }

  console.log(`Seeded ${discoverySourceSeeds.length} discovery source configs.`);
}

async function main() {
  await seedAdmin();
  await seedOtherStaff();
  await seedProviders(12);
  const variants = await seedProductVariants();

  const providers = await prisma.provider.findMany({ select: { id: true } });
  const allVariants = variants.length > 0 ? variants : await prisma.productVariant.findMany({ select: { id: true } });

  await seedOffersAndDiscounts(providers.map((p) => p.id), allVariants.map((v) => v.id));
  await seedEvidenceAndCorrections(providers.map((p) => p.id));
  await seedDiscoverySources();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
