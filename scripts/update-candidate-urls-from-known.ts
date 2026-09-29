import "dotenv/config";
import { readFileSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

import type { Prisma } from "../src/generated/prisma/client";

// Backfills DiscoveryCandidate website URLs from a distance-selling "known pharmacies" JSONL export
// (one { decision: { gphcNumber, officialWebsite, officialProductUrl, evidenceUrls } } per line).
// Candidates are matched by GPhC number; websiteDomain is set from officialWebsite and the full URLs
// are kept on rawPayload.officialListing. Status/review decisions are never touched.
//   npm run discovery:update-candidate-urls -- --input <distance-selling-known.jsonl> [--dry-run]

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const dryRun = process.argv.includes("--dry-run");
const inputIndex = process.argv.indexOf("--input");
const inputPath = inputIndex === -1 ? undefined : process.argv[inputIndex + 1];

type KnownRecord = {
  checkedAt?: string;
  decision?: {
    gphcNumber?: string;
    pharmacyName?: string;
    officialWebsite?: string | null;
    officialProductUrl?: string | null;
    evidenceUrls?: string[];
  };
};

function toDomain(url: string | null | undefined) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function asObject(value: Prisma.JsonValue): Prisma.JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value : { source: value };
}

async function main() {
  if (!inputPath) throw new Error("Usage: npm run discovery:update-candidate-urls -- --input <distance-selling-known.jsonl> [--dry-run]");

  const records = readFileSync(inputPath, "utf8").split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line) as KnownRecord);
  const updated: string[] = [];
  const unchanged: string[] = [];
  const notFound: string[] = [];
  const invalid: string[] = [];
  const warnings: string[] = [];

  for (const { checkedAt, decision } of records) {
    const gphcNumber = decision?.gphcNumber?.trim();
    const websiteDomain = toDomain(decision?.officialWebsite);
    const label = `${decision?.pharmacyName ?? "?"} (GPhC ${gphcNumber ?? "?"})`;
    if (!gphcNumber || !websiteDomain) {
      invalid.push(`${label}: missing GPhC number or valid officialWebsite`);
      continue;
    }

    const candidates = await prisma.discoveryCandidate.findMany({
      where: { gphcNumber },
      select: { id: true, status: true, websiteDomain: true, rawPayload: true },
    });
    if (!candidates.length) {
      notFound.push(label);
      continue;
    }

    const provider = await prisma.provider.findUnique({ where: { websiteDomain }, select: { id: true } });
    if (provider) warnings.push(`${label}: ${websiteDomain} already belongs to provider ${provider.id}`);

    const officialListing = {
      websiteUrl: decision?.officialWebsite ?? null,
      productUrl: decision?.officialProductUrl ?? null,
      evidenceUrls: decision?.evidenceUrls ?? [],
      checkedAt: checkedAt ?? null,
    };

    for (const candidate of candidates) {
      const payload = asObject(candidate.rawPayload);
      // A promoted candidate records the domain its Provider was created with — keep that history
      // intact and only attach the listing URLs.
      const nextDomain = candidate.status === "PROMOTED" && candidate.websiteDomain ? candidate.websiteDomain : websiteDomain;
      // jsonb doesn't preserve key order, so compare field by field rather than as one string.
      const stored = asObject(payload.officialListing ?? null);
      const sameListing = (Object.keys(officialListing) as (keyof typeof officialListing)[])
        .every(key => JSON.stringify(stored[key] ?? null) === JSON.stringify(officialListing[key]));
      if (candidate.websiteDomain === nextDomain && sameListing) {
        unchanged.push(`${label} [${candidate.status}]`);
        continue;
      }
      if (!dryRun) {
        await prisma.discoveryCandidate.update({
          where: { id: candidate.id },
          data: { websiteDomain: nextDomain, rawPayload: { ...payload, officialListing } as Prisma.InputJsonValue },
        });
      }
      updated.push(`${label} [${candidate.status}]: ${candidate.websiteDomain ?? "(none)"} → ${nextDomain}`);
    }
  }

  console.log(`${dryRun ? "[dry run] would update" : "Updated"} ${updated.length} candidate(s):`);
  updated.forEach(line => console.log(`  ~ ${line}`));
  console.log(`Already up to date: ${unchanged.length}`);
  console.log(`No candidate with this GPhC number: ${notFound.length}`);
  notFound.forEach(line => console.log(`  ? ${line}`));
  if (invalid.length) {
    console.log(`Ignored ${invalid.length} invalid record(s):`);
    invalid.forEach(line => console.log(`  ! ${line}`));
  }
  if (warnings.length) {
    console.log(`Domain already used by a provider (${warnings.length}):`);
    warnings.forEach(line => console.log(`  ⚠ ${line}`));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
