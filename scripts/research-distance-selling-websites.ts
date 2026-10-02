import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { stdout } from "node:process";

import { chromium, type Page } from "patchright";

import { gotoWithNetworkRetry } from "./lib/browser-navigation";

type Candidate = { distanceSellingSignal: "HIGH" | "SUPPORTING"; gphcNumber: string; tradingName: string; address: { postcode: string | null } };
type RawLink = { href: string; text: string; attributes: Record<string, string> };
type RawResearchRecord = {
  schemaVersion: 1;
  sequence: number;
  status: "RECEIVED" | "NON_JSON" | "LIMIT_REACHED" | "MANUAL_REVIEW" | "ERROR";
  candidate: Candidate;
  prompt: string;
  requestedAt: string;
  receivedAt: string;
  kind?: "INITIAL" | "FOLLOW_UP";
  followUpQuery?: string;
  google?: { pageUrl?: string; responseText: string; links: RawLink[] };
  error?: string;
};

const googleAiUrl = "https://www.google.com/ai";
const defaultInput = "tmp/distance-selling-candidates-gphc-2026-06-30.json";
const defaultOutput = "tmp/distance-selling-google-ai-raw-results.jsonl";
const defaultProfile = "tmp/price-collection-human-browser";
const manualCheckPattern = /captcha|verify you are human|unusual traffic|security check|not currently available|couldn't sign you in|this browser or app may not be secure/i;
const requestLimitPattern = /reached\s+the\s+request\s+limit\s+for\s+AI\s+responses/i;
const distanceSellingRank = { HIGH: 0, SUPPORTING: 1 } satisfies Record<Candidate["distanceSellingSignal"], number>;

class GoogleAiRequestLimitError extends Error {}

function optionValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function optionalNumber(name: string, fallback: number): number {
  const value = optionValue(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive whole number.`);
  return parsed;
}

function promptFor(candidate: Candidate) {
  return [
    `Research ${candidate.tradingName}, ${candidate.address.postcode ?? "UK"}, GPhC ${candidate.gphcNumber} thoroughly using public web sources.`,
    "Return one compact JSON object. Put BEGIN_PHARMACY_JSON immediately before the object and END_PHARMACY_JSON immediately after it. No other prose.",
    "Use fields: status (ACCEPTED, REJECTED, or NEEDS_REVIEW), officialWebsite, officialProductUrl, listedProductOrTreatment, phone, deliveryOptions, evidenceUrls, reason, confidence.",
    "ACCEPTED requires a direct official public product, treatment, medicine, shop, or ED listing URL. REJECTED requires clear official evidence that the site is directory-only, consultation-only, or prescription-request-only without public listings. If no direct product URL was found but absence is not established, use NEEDS_REVIEW rather than treating missing search results as proof of no products.",
    "Set officialProductUrl to the exact official page that visibly lists named products or treatments. A homepage or general pharmacy-information page is not a product URL unless that exact page visibly lists named items. Set it to null when only the website identity is known. listedProductOrTreatment must be a short string or null, not an array.",
    "In evidenceUrls include direct official pages you actually found that support identity, the product listing, ED treatments, ordering method, delivery method and coverage, NHS/private/OTC supply, or visible prices. Include useful official evidence even when no product URL is found; ChatGPT will classify those details later. Do not infer a feature from the GPhC Internet premises type or from a search snippet alone.",
    "Do not guess or invent links. Include complete https:// URLs only when you found them. Use null for unavailable text/URLs and [] for evidenceUrls.",
  ].join(" ");
}

function followUpPrompt(candidate: Candidate, query: string) {
  return [
    `Research ${candidate.tradingName}, GPhC ${candidate.gphcNumber}. ${query}`,
    "Return one compact JSON object between BEGIN_PHARMACY_JSON and END_PHARMACY_JSON.",
    "Use fields status, officialWebsite, officialProductUrl, listedProductOrTreatment, phone, deliveryOptions, evidenceUrls, reason, confidence.",
    "Only use complete, direct official https:// URLs found in public sources. Do not guess URLs. Use null or [] when evidence is unavailable.",
    "Include in evidenceUrls any directly found official pages that support listing, ED, checkout/consultation, delivery, medicine supply, or public prices; omit unsupported claims.",
    "ACCEPTED requires a public official product, medicine, treatment, shop or ED listing URL. Use REJECTED only with clear official exclusion evidence; otherwise use NEEDS_REVIEW, since not finding a URL does not prove absence.",
    "officialProductUrl must be the exact page visibly listing named products or treatments, not merely the homepage or pharmacy-information page. listedProductOrTreatment is one short string or null, never an array.",
  ].join(" ");
}

function knownPriceAuditPrompt(candidate: Candidate, query: string) {
  return [
    `Audit the already-accepted pharmacy ${candidate.tradingName}, GPhC ${candidate.gphcNumber}. ${query}`,
    "Return one compact JSON object between BEGIN_PHARMACY_JSON and END_PHARMACY_JSON; no other prose.",
    "Fields: status (RECEIVED or NEEDS_REVIEW), reason, officialWebsite, productPages, evidenceUrls. productPages is an array of {url, pageType, products}; products is an array of {name, priceGbp, priceBasis, erectileDysfunction}. pageType is PRODUCT, TREATMENT_LIST, SERVICE_ONLY, PRESCRIPTION_REQUEST_ONLY, or UNKNOWN.",
    "Include only direct public pages on the official pharmacy website or a clearly linked operating brand. For each product-price pair, cite the exact page URL and copy only a publicly visible GBP price tied to that named product. A generic 'from' price, consultation fee, delivery fee, or price from another product is not an exact price. Use null where the name, pack/strength basis, or price cannot be verified.",
    "Distinguish a page that lists named ED medicines from a consultation or prescription request. Do not infer ED from the pharmacy's registration type. Do not claim that an entire pharmacy has no products merely because a search or one page found none. In that case use NEEDS_REVIEW and explain the gap.",
    "Do not invent links or prices. Include every product page URL in evidenceUrls; use [] if no direct source exists.",
  ].join(" ");
}

function compactGoogleJson(text: string): string | null {
  const matches = [...text.matchAll(/BEGIN_PHARMACY_JSON([\s\S]*?)END_PHARMACY_JSON/gi)];
  for (const match of matches.reverse()) {
    try {
      const value = JSON.parse(match[1].trim()) as Record<string, unknown>;
      if (typeof value.status === "string" && typeof value.reason === "string") return JSON.stringify(value);
    } catch {
      // Keep waiting while Google streams an incomplete object.
    }
  }
  return null;
}

function completedRecords(path: string) {
  if (!existsSync(path)) return [] as RawResearchRecord[];
  return readFileSync(path, "utf8").split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];
    try { return [JSON.parse(line) as RawResearchRecord]; }
    catch { throw new Error(`Invalid JSONL in ${path} at line ${index + 1}.`); }
  });
}

function appendRecord(path: string, record: RawResearchRecord) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
}

function removeErrorRecords(path: string, records: RawResearchRecord[]) {
  const retained = records.filter(record => record.status !== "ERROR");
  if (retained.length === records.length) return retained;
  writeFileSync(path, `${retained.map(record => JSON.stringify(record)).join("\n")}\n`, "utf8");
  stdout.write(`Removed ${records.length - retained.length} error record(s) from ${path}.\n`);
  return retained;
}

async function waitForManualClearance(page: Page) {
  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    const body = await page.locator("body").innerText();
    if (requestLimitPattern.test(body)) throw new GoogleAiRequestLimitError("Google AI request limit reached. The run stopped; wait until Google permits more AI responses, then rerun to resume.");
    if (!manualCheckPattern.test(body)) return;
    stdout.write("Google needs manual verification in the open Patchright browser. Complete it there; this run will wait up to five minutes.\n");
    await page.waitForTimeout(2_000);
  }
  throw new Error("Google verification was not completed within five minutes.");
}

async function captureResponse(page: Page) {
  const deadline = Date.now() + 150_000;
  let priorText = "";
  let stableReads = 0;
  let nonJsonStableReads = 0;
  while (Date.now() < deadline) {
    const responseText = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
    if (requestLimitPattern.test(responseText)) throw new GoogleAiRequestLimitError("Google AI request limit reached. The run stopped; wait until Google permits more AI responses, then rerun to resume.");
    if (manualCheckPattern.test(responseText)) throw new Error("Google requested manual verification.");
    const compact = compactGoogleJson(responseText);
    stableReads = responseText === priorText && compact ? stableReads + 1 : 0;
    nonJsonStableReads = responseText === priorText && !compact && responseText.length > 200 ? nonJsonStableReads + 1 : 0;
    priorText = responseText;
    if (stableReads >= 4 && compact) {
      return { responseText: compact, links: [] };
    }
    if (nonJsonStableReads >= 30) {
      return { responseText: responseText.slice(0, 20_000), links: [], nonJson: true };
    }
    await page.waitForTimeout(1_000);
  }
  throw new Error("Google AI did not finish a valid compact JSON response within 150 seconds.");
}

async function main() {
  const inputPath = resolve(process.cwd(), optionValue("--input") ?? defaultInput);
  const outputPath = resolve(process.cwd(), optionValue("--output") ?? defaultOutput);
  const profilePath = resolve(process.cwd(), optionValue("--profile") ?? defaultProfile);
  const limit = optionalNumber("--limit", 10);
  const selectedGphc = optionValue("--gphc");
  const followUpQuery = optionValue("--query");
  const knownPriceAudit = process.argv.includes("--audit-known-price");
  if (knownPriceAudit && !followUpQuery) throw new Error("--audit-known-price requires --query.");
  if (followUpQuery && !selectedGphc) throw new Error("--query requires --gphc.");
  const input = JSON.parse(readFileSync(inputPath, "utf8")) as { candidates: Candidate[] };
  const existing = process.argv.includes("--remove-error-records")
    ? removeErrorRecords(outputPath, completedRecords(outputPath))
    : completedRecords(outputPath);
  const completed = new Set(existing.filter(record => record.status === "RECEIVED" && record.kind !== "FOLLOW_UP").map(record => record.candidate.gphcNumber));
  const alreadyAsked = new Set(existing.filter(record => record.status === "RECEIVED" && record.kind === "FOLLOW_UP").map(record => `${record.candidate.gphcNumber}| ${record.followUpQuery}`));
  const pending = input.candidates
    .map(candidate => ({
      distanceSellingSignal: candidate.distanceSellingSignal,
      gphcNumber: candidate.gphcNumber,
      tradingName: candidate.tradingName,
      address: { postcode: candidate.address.postcode },
    }))
    .filter(candidate => {
      if (selectedGphc && candidate.gphcNumber !== selectedGphc) return false;
      if (followUpQuery) return !alreadyAsked.has(`${candidate.gphcNumber}| ${followUpQuery}`);
      return !completed.has(candidate.gphcNumber);
    })
    .sort((left, right) => distanceSellingRank[left.distanceSellingSignal] - distanceSellingRank[right.distanceSellingSignal])
    .slice(0, limit);
  if (!pending.length) {
    stdout.write("No unprocessed candidates remain.\n");
    return;
  }

  const context = await chromium.launchPersistentContext(profilePath, { channel: "chrome", headless: false, viewport: null, args: ["--start-maximized"] });
  const page = context.pages()[0] ?? await context.newPage();
  let sequence = existing.reduce((highest, record) => Math.max(highest, record.sequence), 0);
  try {
    await gotoWithNetworkRetry(page, googleAiUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForManualClearance(page);
    for (const [index, candidate] of pending.entries()) {
      const prompt = knownPriceAudit ? knownPriceAuditPrompt(candidate, followUpQuery!) : followUpQuery ? followUpPrompt(candidate, followUpQuery) : promptFor(candidate);
      const kind = followUpQuery ? "FOLLOW_UP" : "INITIAL";
      const requestedAt = new Date().toISOString();
      stdout.write(`[${index + 1}/${pending.length}] ${candidate.tradingName} (${candidate.gphcNumber})\n`);
      try {
        const inputBox = page.locator('textarea:visible, input[name="q"]:visible, [contenteditable="true"]:visible').first();
        await inputBox.fill(prompt);
        await inputBox.press("Enter");
        const google = await captureResponse(page);
        appendRecord(outputPath, { schemaVersion: 1, sequence: ++sequence, kind, followUpQuery, status: google.nonJson ? "NON_JSON" : "RECEIVED", candidate, prompt, requestedAt, receivedAt: new Date().toISOString(), google });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const requestLimitReached = error instanceof GoogleAiRequestLimitError;
        const needsManualReview = /manual verification|Google verification/i.test(message);
        let status: RawResearchRecord["status"] = "ERROR";
        if (needsManualReview) status = "MANUAL_REVIEW";
        if (requestLimitReached) status = "LIMIT_REACHED";
        appendRecord(outputPath, { schemaVersion: 1, sequence: ++sequence, kind, followUpQuery, status, candidate, prompt, requestedAt, receivedAt: new Date().toISOString(), error: message });
        if (requestLimitReached) {
          stdout.write("Google AI request limit reached. Stopping now; all earlier raw records remain saved.\n");
          process.exitCode = 2;
          break;
        }
        if (needsManualReview) {
          await waitForManualClearance(page);
          process.exitCode = 2;
          break;
        }
        process.exitCode = 2;
        break;
      }
      await page.waitForTimeout(4_000);
    }
  } finally {
    await context.close();
  }
  stdout.write(`Google research saved to ${outputPath}.\n`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
