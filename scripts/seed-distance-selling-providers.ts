import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { createProviderSchema } from "../src/actions/providers/provider-schema";
import { createProviderRecord } from "../src/actions/providers/create-provider-record";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Per explicit client direction (2026-09-18): priority moved from pharmacy-listing discovery
// automation to pricing scraping. NHSBSA's real Contractor Details dataset
// (DISTANCE_SELLING_CONTRACTOR: "Y" — see src/lib/discovery/adapters/nhsbsa-contractor-details.ts)
// returns 468 real online distance-selling pharmacies, but carries no website field, so it alone
// can't satisfy Provider.websiteDomain (required + unique — and a scraper needs a real URL
// anyway). The normal path to a verified website is Google AI Mode enrichment
// (src/lib/discovery/google-ai-enrichment.ts), which is confirmed blocked in this environment
// (see docs/current-tasks.md, 2026-09-18 entry). Rather than fabricate a placeholder domain, this
// is a manually curated, individually verified subset: well-known real UK online pharmacy brands
// (same list docs/implementation-plan.md's Phase 1 already names) matched against NHSBSA's real
// record by exact name, then confirmed via the public GPhC register — same identity check the
// existing pipeline uses elsewhere (name + postcode match against a hard identifier), just done by
// hand instead of by an adapter. Every row below was verified live on 2026-09-18: NHSBSA's
// postcode/ODS code cross-checked against the GPhC register's own address for that registration
// number (caught one real mismatch in the process — Pharmica's brand-level GPhC number, 9012030,
// is a *different* registered premises; 9010807 is the one matching NHSBSA's EC1M 5PA record).
// Seeded at ProviderStatus.DISCOVERED (the default) — same as any other newly-found provider, not
// pre-verified further; Evidence rows are left PENDING (no staff reviewer involved yet) rather than
// reusing the staff-promote flow's auto-APPROVED, since no staff member actually reviewed these.
const verifiedDistanceSellers = [
  {
    legalName: "HR Healthcare Limited",
    tradingName: "Treated.com",
    websiteDomain: "treated.com",
    odsCode: "FW367",
    gphcNumber: "9010946",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/9010946",
  },
  {
    legalName: "ABSM Healthcare Ltd",
    tradingName: "The Independent Pharmacy",
    websiteDomain: "theindependentpharmacy.co.uk",
    odsCode: "FA396",
    gphcNumber: "9012559",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/9012559",
  },
  {
    legalName: "Medino Online Ltd",
    tradingName: "Medino",
    websiteDomain: "medino.com",
    odsCode: "FQF90",
    gphcNumber: "9011921",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/9011921",
  },
  {
    legalName: "Pharmica Ltd",
    tradingName: "Pharmica",
    websiteDomain: "pharmica.co.uk",
    odsCode: "FEW08",
    gphcNumber: "9010807",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/9010807",
  },
  {
    legalName: "Innox Trading Limited",
    tradingName: "Chemist4U",
    websiteDomain: "chemist-4-u.com",
    odsCode: "FPQ59",
    gphcNumber: "9012464",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/9012464",
  },
  {
    legalName: "Pharmacy2U Ltd",
    tradingName: "Pharmacy2U",
    websiteDomain: "pharmacy2u.co.uk",
    odsCode: "FLM49",
    gphcNumber: "9010146",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/9010146",
  },
  {
    legalName: "Varioline Health Ltd",
    tradingName: "Click Pharmacy",
    websiteDomain: "clickpharmacy.co.uk",
    odsCode: "FN869",
    gphcNumber: "9011460",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/9011460",
  },
  {
    legalName: "Frosts (Online) Limited",
    tradingName: "Oxford Online Pharmacy",
    websiteDomain: "oxfordonlinepharmacy.co.uk",
    odsCode: "FDV23",
    gphcNumber: "9012796",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/9012796",
  },
  // Second batch (2026-09-18, later same day) — client said not to wait on the Google AI Mode
  // fix, keep going with the same manual-verify process. Same rigor caught two more real
  // near-miss mismatches here: "Lloyds Clinical" first resolved to GPhC 1117146 (a *different*
  // Lloyds Clinical premises at CM19 5TR) before a closer look found 1091717, the one whose
  // address actually matches NHSBSA's CM19 5GU record; and NHSBSA has four distinct, unrelated
  // "Online Chemist"/"The Online Chemist" trading names, so only the one address-matched to
  // onlinechemistuk.net (Gorleston, NR31 7AH — already referenced in this project's own earlier
  // research as "OnlineChemist UK") was used, not any of the other three. "Carewell Pharmacy" and
  // "Medinet Healthcare Ltd" were looked up but dropped — no confident single real-website match.
  {
    legalName: "Online Express Medicines Ltd",
    tradingName: "SimplyMeds Online",
    websiteDomain: "simplymedsonline.co.uk",
    odsCode: "FX730",
    gphcNumber: "9010764",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/9010764",
  },
  {
    legalName: "HKK Consultancy Services Limited",
    tradingName: "myPharmacy Direct",
    websiteDomain: "mypharmacydirect.co.uk",
    odsCode: "FVX33",
    gphcNumber: "9010475",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/9010475",
  },
  {
    legalName: "Nomaz Limited",
    tradingName: "Online Chemist",
    websiteDomain: "onlinechemistuk.net",
    odsCode: "FGF70",
    gphcNumber: "9011159",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/9011159",
  },
  {
    legalName: "Lloyds Clinical Limited",
    tradingName: "Lloyds Clinical",
    websiteDomain: "lpclinicalhomecare.co.uk",
    odsCode: "FKL27",
    gphcNumber: "1091717",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/1091717",
  },
  {
    legalName: "My Pharmacy Online UK Ltd",
    tradingName: "My Pharmacy Online",
    websiteDomain: "mypharmacyonline.co.uk",
    odsCode: "FAX35",
    gphcNumber: "9011830",
    evidenceUrl: "https://www.pharmacyregulation.org/registers/pharmacy/9011830",
  },
];

async function main() {
  const created: { tradingName: string; providerId: string }[] = [];
  const skipped: { tradingName: string; reason: string }[] = [];

  for (const entry of verifiedDistanceSellers) {
    const parsed = createProviderSchema.safeParse({
      legalName: entry.legalName,
      tradingName: entry.tradingName,
      websiteDomain: entry.websiteDomain,
      regulatorType: "GPHC",
      regulatorReference: entry.gphcNumber,
      serviceRegions: "England",
    });
    if (!parsed.success) {
      skipped.push({ tradingName: entry.tradingName, reason: JSON.stringify(parsed.error.flatten().fieldErrors) });
      continue;
    }

    try {
      const providerId = await prisma.$transaction(async (tx) => {
        const provider = await createProviderRecord(tx, parsed.data);

        await tx.providerIdentifier.createMany({
          data: [
            { providerId: provider.id, identifierType: "ODS_CODE", value: entry.odsCode, source: "NHSBSA_CONTRACTOR_DETAILS" },
            { providerId: provider.id, identifierType: "GPHC_NUMBER", value: entry.gphcNumber, source: null },
          ],
          skipDuplicates: true,
        });

        await tx.evidence.create({
          data: {
            providerId: provider.id,
            sourceUrl: entry.evidenceUrl,
            retrievedAt: new Date(),
            checkedAt: new Date(),
          },
        });

        return provider.id;
      });
      created.push({ tradingName: entry.tradingName, providerId });
    } catch (error) {
      const isDuplicateDomain = error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002";
      skipped.push({ tradingName: entry.tradingName, reason: isDuplicateDomain ? "duplicate websiteDomain/identifier" : String(error) });
    }
  }

  const runDir = join(process.cwd(), "tmp", "provider-audit", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, "seeded-distance-sellers.json"), JSON.stringify({ created, skipped }, null, 2), "utf-8");

  console.log(`Created ${created.length} providers:`);
  for (const c of created) console.log(`  - ${c.tradingName} (${c.providerId})`);
  if (skipped.length) {
    console.log(`Skipped ${skipped.length}:`);
    for (const s of skipped) console.log(`  - ${s.tradingName}: ${s.reason}`);
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
