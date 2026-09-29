import "dotenv/config";
import { readFileSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

import type { Prisma } from "../src/generated/prisma/client";

// Seeds GPhC DiscoveryCandidates from a pharmacy ED-audit JSONL export (one record per line, keyed
// by GPhC number). Never duplicates: a record is skipped when its GPhC number or website domain
// already belongs to a Provider or to any DiscoveryCandidate (from any source), or repeats within
// the file. Existing rows are never modified.
//   npm run discovery:seed-audit-candidates -- --input <audit.jsonl> [--dry-run]

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const dryRun = process.argv.includes("--dry-run");
const inputIndex = process.argv.indexOf("--input");
const inputPath = inputIndex === -1 ? undefined : process.argv[inputIndex + 1];

type AuditRecord = {
  gphcNumber?: string;
  pharmacyName?: string;
  citedUrls?: string[];
  products?: { url?: string }[];
};

type SeedRow = { gphcNumber: string; name: string; websiteDomain: string | null; audit: AuditRecord };

function officialDomain(record: AuditRecord) {
  const urls = [...(record.citedUrls ?? []), ...(record.products ?? []).flatMap(product => product.url ? [product.url] : [])];
  for (const url of urls) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      // unparseable URL — try the next one
    }
  }
  return null;
}

function readRows(path: string) {
  const rows: SeedRow[] = [];
  const invalid: string[] = [];
  readFileSync(path, "utf8").split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const audit = JSON.parse(line) as AuditRecord;
    const gphcNumber = audit.gphcNumber?.trim();
    const name = audit.pharmacyName?.trim();
    if (!gphcNumber || !name) {
      invalid.push(`line ${index + 1}: missing gphcNumber/pharmacyName`);
      return;
    }
    rows.push({ gphcNumber, name, websiteDomain: officialDomain(audit), audit });
  });
  return { rows, invalid };
}

async function findDuplicateReason(sourceId: string, row: SeedRow) {
  const providerIdentifier = await prisma.providerIdentifier.findUnique({
    where: { identifierType_value: { identifierType: "GPHC_NUMBER", value: row.gphcNumber } },
    select: { providerId: true },
  });
  if (providerIdentifier) return `provider ${providerIdentifier.providerId} already has this GPhC number`;

  if (row.websiteDomain) {
    const provider = await prisma.provider.findUnique({ where: { websiteDomain: row.websiteDomain }, select: { id: true } });
    if (provider) return `provider ${provider.id} already uses ${row.websiteDomain}`;
  }

  const candidate = await prisma.discoveryCandidate.findFirst({
    where: { OR: [
      { sourceId, sourceRecordId: row.gphcNumber },
      { gphcNumber: row.gphcNumber },
      ...(row.websiteDomain ? [{ websiteDomain: row.websiteDomain }] : []),
    ] },
    select: { id: true, status: true },
  });
  return candidate ? `candidate ${candidate.id} (${candidate.status}) already exists` : null;
}

async function main() {
  if (!inputPath) throw new Error("Usage: npm run discovery:seed-audit-candidates -- --input <audit.jsonl> [--dry-run]");

  const { rows, invalid } = readRows(inputPath);
  // The GPhC source is created disabled if it doesn't exist yet (a dry run leaves it absent).
  const existingSource = await prisma.discoverySource.findUnique({ where: { type: "GPHC" }, select: { id: true } });
  const source = existingSource ?? (dryRun
    ? { id: "" }
    : await prisma.discoverySource.create({ data: { type: "GPHC", cadence: "MONTHLY" }, select: { id: true } }));

  const seenGphc = new Set<string>();
  const seenDomains = new Set<string>();
  const created: string[] = [];
  const skipped: string[] = [];

  for (const row of rows) {
    const label = `${row.name} (GPhC ${row.gphcNumber})`;
    if (seenGphc.has(row.gphcNumber) || (row.websiteDomain && seenDomains.has(row.websiteDomain))) {
      skipped.push(`${label}: repeated in input file`);
      continue;
    }
    seenGphc.add(row.gphcNumber);
    if (row.websiteDomain) seenDomains.add(row.websiteDomain);

    const duplicateReason = await findDuplicateReason(source.id, row);
    if (duplicateReason) {
      skipped.push(`${label}: ${duplicateReason}`);
      continue;
    }

    if (!dryRun) {
      await prisma.discoveryCandidate.create({
        data: {
          sourceId: source.id,
          sourceRecordId: row.gphcNumber,
          gphcNumber: row.gphcNumber,
          name: row.name,
          websiteDomain: row.websiteDomain,
          rawPayload: { edAudit: row.audit } as Prisma.InputJsonValue,
        },
      });
    }
    created.push(`${label}${row.websiteDomain ? ` — ${row.websiteDomain}` : ""}`);
  }

  console.log(`${dryRun ? "[dry run] would create" : "Created"} ${created.length} candidate(s):`);
  created.forEach(line => console.log(`  + ${line}`));
  console.log(`Skipped ${skipped.length} duplicate(s):`);
  skipped.forEach(line => console.log(`  - ${line}`));
  if (invalid.length) {
    console.log(`Ignored ${invalid.length} invalid line(s):`);
    invalid.forEach(line => console.log(`  ! ${line}`));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
