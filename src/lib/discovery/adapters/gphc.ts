import { readFileSync } from "node:fs";

import { chromium } from "playwright";
import { read as readWorkbook, utils as sheetUtils } from "xlsx";

import type { DiscoveryAdapter, NormalizedCandidate } from "@/types/discovery";

const REGISTERS_PAGE_URL = "https://www.pharmacyregulation.org/registers";
const HEADER_CELL = "Pharmacy Registration Number";
// Confirmed live: this site's bot-protection blocks Playwright's *default* headless User-Agent
// (which includes "HeadlessChrome") with a 403, on both the page and the file download — a plain
// browser-shaped UA string is what actually gets through, not headless-vs-headed mode itself.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// Confirmed live (2026-09-17), same rigor as every other real adapter:
// - The registers page and the download it links to both 403 a plain server-side fetch — that's
//   this site's own bot-detection, not a genuine access restriction (a browser User-Agent header
//   alone was enough to get a real 200 in testing). A real headless browser is more durable against
//   this than a spoofed header, and — per explicit client instruction — also more durable against
//   the download mechanism changing shape (URL, redirect, JS-generated link) between quarterly
//   releases than parsing a fetched HTML string would be.
// - Real markup on the page, confirmed via direct inspection (not guessed): the download link sits
//   inside `<div class="content-block--link-info-card ...">` alongside an
//   `<h2 class="block__title">Looking for a list of pharmacies?</h2>` — a second, similarly-shaped
//   card exists on the same page ("Superintendents of more than one organisation" → "See the
//   superintendent register"), so the heading text is what actually disambiguates the right card,
//   not the button text alone.
// - Real header row confirmed from a downloaded file (not row 0 — several title/count rows precede
//   it): "Pharmacy Registration Number, Trading Name, [blank], Address Line 1-3, Town, [blank],
//   County, Country, Postcode, Region (England Only), Owner Name, Premises Type, Internet Pharmacy
//   Logo, Status At Snapshot, Current Status, PHA Initial Registration Date, PHA Renewal Date, PHA
//   Expiry Date". Real sample row confirmed too (GPhC number 1028531, "A.H. Hale Ltd." trading as
//   "The Bathwick Pharmacy", postcode "BA24BQ", Current Status "Registered").
//
// Compliance note: GPhC's general web terms-of-use state standard "all rights reserved" copyright
// with no explicit Open Government Licence found for this file (unlike NHSBSA/Companies
// House/NHS ODS, which are all clearly OGL) — flagged to the client directly; their explicit
// decision was to build this anyway rather than wait for licence confirmation. Recorded as an
// accepted residual risk, same pattern M1 used for its own human-judgment items — see
// docs/milestones/04-pharmacy-listing.md.
type RegisterRow = Record<string, unknown>;

// SheetJS returns numeric-looking cells (e.g. Pharmacy Registration Number) as JS `number`, not
// `string` — a strict `typeof === "string"` check here silently drops every row, since the
// spreadsheet has no numeric-only column we'd want to keep as a raw number instead of an ID string.
function readCell(row: RegisterRow, key: string): string | undefined {
  const value = row[key];
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

// Finds the real header row by content, not a hardcoded row index — the title/count preamble rows
// above it are a GPhC export-template detail that could shift between releases.
function findHeaderRowIndex(rows: unknown[][]): number {
  const index = rows.findIndex((row) => row[0] === HEADER_CELL);
  if (index === -1) {
    throw new Error(`GPhC premises list: could not find the header row (looked for "${HEADER_CELL}") — the spreadsheet layout may have changed.`);
  }
  return index;
}

function normalize(row: RegisterRow): NormalizedCandidate | null {
  const gphcNumber = readCell(row, "Pharmacy Registration Number");
  const name = readCell(row, "Trading Name");
  if (!gphcNumber || !name) {
    console.warn("[discovery:gphc] skipping row missing Pharmacy Registration Number/Trading Name", row);
    return null;
  }

  return {
    sourceRecordId: gphcNumber,
    name,
    postcode: readCell(row, "Postcode"),
    gphcNumber,
    rawPayload: row as NormalizedCandidate["rawPayload"],
  };
}

export const gphcAdapter: DiscoveryAdapter = {
  type: "GPHC",
  async run({ recordRequest }) {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ userAgent: BROWSER_USER_AGENT });
      await page.goto(REGISTERS_PAGE_URL, { waitUntil: "domcontentloaded" });

      const card = page.locator(".content-block--link-info-card", {
        has: page.getByRole("heading", { name: "Looking for a list of pharmacies?" }),
      });
      const downloadLink = card.getByRole("link", { name: "Download the list" });

      const [download] = await Promise.all([page.waitForEvent("download"), downloadLink.click()]);
      recordRequest?.(`GET ${download.url()} (via headless browser — pharmacyregulation.org blocks non-browser requests, confirmed live)`);

      const downloadedPath = await download.path();
      if (!downloadedPath) {
        throw new Error("GPhC premises list download did not produce a local file.");
      }
      const buffer = readFileSync(downloadedPath);

      const workbook = readWorkbook(buffer, { cellDates: true, type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = sheetUtils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });

      // range: headerIndex tells sheet_to_json to treat that row as the header row and build
      // objects keyed by its real column names for every row after it.
      const headerIndex = findHeaderRowIndex(rawRows);
      const dataRows = sheetUtils.sheet_to_json<RegisterRow>(sheet, { range: headerIndex, defval: null });

      return dataRows
        .filter((row) => readCell(row, "Current Status") === "Registered")
        .map(normalize)
        .filter((candidate): candidate is NormalizedCandidate => candidate !== null);
    } finally {
      await browser.close();
    }
  },
};
