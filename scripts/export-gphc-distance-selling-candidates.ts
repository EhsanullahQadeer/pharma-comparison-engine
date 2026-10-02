import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { stdout } from "node:process";

import { read as readWorkbook, utils as sheetUtils } from "xlsx";

const HEADER_CELL = "Pharmacy Registration Number";
const defaultInputPath = "Registered-Premises-List-30-06-2026_0 (1).xlsx";
const defaultOutputPath = "tmp/distance-selling-candidates-gphc-2026-06-30.json";

type RegisterRow = Record<string, unknown>;

type DistanceSellingCandidate = {
  distanceSellingSignal: "HIGH" | "SUPPORTING";
  signalReasons: string[];
  gphcNumber: string;
  tradingName: string;
  ownerName: string | null;
  premisesType: string | null;
  internetPharmacyLogo: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    line3: string | null;
    town: string | null;
    county: string | null;
    country: string | null;
    postcode: string | null;
  };
  registerRecord: RegisterRow;
};

function optionValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function readCell(row: RegisterRow, column: string): string | null {
  const value = row[column];
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function findHeaderRow(rows: unknown[][]): number {
  const headerRow = rows.findIndex((row) => row[0] === HEADER_CELL);
  if (headerRow === -1) {
    throw new Error(`Could not find the "${HEADER_CELL}" header. Check that this is a GPhC registered-premises export.`);
  }
  return headerRow;
}

function candidateFrom(row: RegisterRow): DistanceSellingCandidate | null {
  if (readCell(row, "Current Status") !== "Registered") return null;

  const premisesType = readCell(row, "Premises Type");
  const internetPharmacyLogo = readCell(row, "Internet Pharmacy  Logo");
  const isInternetPremises = premisesType === "Internet";
  const hasInternetLogo = internetPharmacyLogo === "Yes";
  if (!isInternetPremises && !hasInternetLogo) return null;

  const gphcNumber = readCell(row, "Pharmacy Registration Number");
  const tradingName = readCell(row, "Trading Name");
  if (!gphcNumber || !tradingName) return null;

  const signalReasons = [
    ...(isInternetPremises ? ["GPhC register lists Premises Type as Internet"] : []),
    ...(hasInternetLogo ? ["GPhC register records Internet Pharmacy Logo as Yes"] : []),
  ];

  return {
    distanceSellingSignal: isInternetPremises ? "HIGH" : "SUPPORTING",
    signalReasons,
    gphcNumber,
    tradingName,
    ownerName: readCell(row, "Owner Name"),
    premisesType,
    internetPharmacyLogo,
    address: {
      line1: readCell(row, "Address Line 1"),
      line2: readCell(row, "Address Line 2"),
      line3: readCell(row, "Address Line 3"),
      town: readCell(row, "Town"),
      county: readCell(row, "County"),
      country: readCell(row, "Country"),
      postcode: readCell(row, "Postcode"),
    },
    registerRecord: row,
  };
}

function main() {
  const inputPath = resolve(process.cwd(), optionValue("--input") ?? defaultInputPath);
  const outputPath = resolve(process.cwd(), optionValue("--output") ?? defaultOutputPath);
  const workbook = readWorkbook(readFileSync(inputPath), { cellDates: true, type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("The workbook has no readable worksheet.");

  const grid = sheetUtils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  const rows = sheetUtils.sheet_to_json<RegisterRow>(sheet, { range: findHeaderRow(grid), defval: null });
  const candidates = rows.flatMap((row) => {
    const candidate = candidateFrom(row);
    return candidate ? [candidate] : [];
  });
  const highConfidenceCount = candidates.filter((candidate) => candidate.distanceSellingSignal === "HIGH").length;

  const exportData = {
    generatedAt: new Date().toISOString(),
    source: {
      fileName: inputPath.split(/[\\/]/).at(-1),
      worksheet: workbook.SheetNames[0],
      registeredPremisesReviewed: rows.filter((row) => readCell(row, "Current Status") === "Registered").length,
    },
    criteria: {
      HIGH: "Current Status is Registered and Premises Type is Internet.",
      SUPPORTING: "Current Status is Registered, Internet Pharmacy Logo is Yes, and Premises Type is not Internet. This is a supporting signal, not confirmation of a current distance-selling service.",
    },
    summary: {
      totalCandidates: candidates.length,
      highConfidenceCandidates: highConfidenceCount,
      supportingCandidates: candidates.length - highConfidenceCount,
    },
    candidates,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(exportData, null, 2), "utf8");
  stdout.write(`Exported ${candidates.length} candidates (${highConfidenceCount} high-confidence) to ${outputPath}\n`);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
