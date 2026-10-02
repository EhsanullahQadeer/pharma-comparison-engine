import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { stdout } from "node:process";

import { chromium } from "patchright";

import { gotoWithNetworkRetry } from "./lib/browser-navigation";
import { decisionJsonInPage, normalizeChatgptDisplayText } from "./lib/chatgpt-response";
import { auditKnownProductPage, type AuditedProduct, type AuditClassification } from "./lib/known-pharmacy-product-audit";
import { collectPublicWebsite } from "../src/lib/discovery/public-web";
import type { ReviewedDecision } from "./lib/distance-selling-classification";

type KnownRow = { sourceGoogleSequence: number; checkedAt: string; decision: ReviewedDecision };
type GoogleRow = { sequence: number; status: string; followUpQuery?: string; candidate: { gphcNumber: string }; google?: { responseText: string }; error?: string };
type ChatgptDecision = { gphcNumber: string; status: "ACCEPTED" | "REJECTED" | "NEEDS_REVIEW"; productPages: string[]; evidenceUrls: string[]; reason: string };
type AuditRow = {
  schemaVersion: 1; gphcNumber: string; pharmacyName: string; classification: AuditClassification;
  listedErectileDysfunctionProducts: number; pricedErectileDysfunctionProducts: number;
  products: Array<AuditedProduct & { url: string }>;
  checkedAt: string; sourceKnownGoogleSequence: number; sourceAuditGoogleSequence: number;
  citedUrls: string[]; reason: string; chatgptStatus: ChatgptDecision["status"];
};

const cwd = process.cwd();
const knownPath = resolve(cwd, "tmp/distance-selling-known.jsonl");
const auditDirectory = resolve(cwd, "tmp/distance-selling-product-price-audit");
const googlePath = resolve(auditDirectory, "google.jsonl");
const ledgerPath = resolve(auditDirectory, "audit.jsonl");
const outputPaths: Record<AuditClassification, string> = {
  VERIFIED_PRICED_PRODUCTS: resolve(auditDirectory, "priced-products.jsonl"),
  PRODUCT_LISTED_PRICE_UNVERIFIED: resolve(auditDirectory, "products-no-price.jsonl"),
  NO_PRODUCT_ON_CITED_PAGE: resolve(auditDirectory, "no-product-on-cited-page.jsonl"),
  NEEDS_REVIEW: resolve(auditDirectory, "needs-review.jsonl"),
};
const profilePath = resolve(cwd, "tmp/price-collection-human-browser");
const tsxCli = resolve(cwd, "node_modules/tsx/dist/cli.mjs");

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];
    try { return [JSON.parse(line) as T]; }
    catch { throw new Error(`Invalid JSONL in ${path} at line ${index + 1}.`); }
  });
}

function saveAudit(row: AuditRow) {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  appendFileSync(ledgerPath, `${JSON.stringify(row)}\n`, "utf8");
  const latest = new Map(readJsonl<AuditRow>(ledgerPath).map(item => [item.gphcNumber, item]));
  for (const [classification, path] of Object.entries(outputPaths)) {
    const records = [...latest.values()].filter(item => item.classification === classification);
    writeFileSync(path, records.map(item => JSON.stringify(item)).join("\n") + (records.length ? "\n" : ""), "utf8");
  }
}

async function runGoogle(gphcNumber: string, query: string): Promise<GoogleRow> {
  const args = [tsxCli, resolve(cwd, "scripts/research-distance-selling-websites.ts"),
    "--input", resolve(cwd, "tmp/distance-selling-candidates-gphc-2026-06-30.json"),
    "--output", googlePath, "--profile", profilePath, "--gphc", gphcNumber,
    "--query", query, "--audit-known-price", "--limit", "1"];
  const exitCode = await new Promise<number>((finish, reject) => {
    const child = spawn(process.execPath, args, { cwd, stdio: "inherit", windowsHide: false });
    child.on("error", reject);
    child.on("close", code => finish(code ?? 1));
  });
  if (exitCode !== 0) throw new Error(`Google AI price audit stopped with exit code ${exitCode}; existing results were preserved.`);
  const record = readJsonl<GoogleRow>(googlePath).findLast(item => item.candidate.gphcNumber === gphcNumber && item.followUpQuery === query && ["RECEIVED", "NON_JSON"].includes(item.status));
  if (!record?.google) throw new Error(`Google AI did not save a completed price audit for ${gphcNumber}.`);
  return record;
}

async function checkChatgptSignIn(): Promise<void> {
  const exitCode = await new Promise<number>((finish, reject) => {
    const child = spawn(process.execPath, [tsxCli, resolve(cwd, "scripts/review-distance-selling-google-results.ts"),
      "--profile", profilePath, "--check-sign-in"], { cwd, stdio: "inherit", windowsHide: false });
    child.on("error", reject);
    child.on("close", code => finish(code ?? 1));
  });
  if (exitCode !== 0) throw new Error("ChatGPT is not signed in to the audit profile. No Google price-audit query was sent.");
}

function googleUrls(record: GoogleRow): Set<string> {
  const parsed = JSON.parse(record.google!.responseText) as { evidenceUrls?: unknown; productPages?: unknown };
  const urls = [
    ...(Array.isArray(parsed.evidenceUrls) ? parsed.evidenceUrls : []),
    ...(Array.isArray(parsed.productPages) ? parsed.productPages.flatMap(page =>
      page && typeof page === "object" && "url" in page ? [page.url] : []) : []),
  ];
  return new Set(urls.filter((value): value is string => typeof value === "string" && URL.canParse(value)));
}

function chatgptPrompt(known: KnownRow, google: GoogleRow): string {
  return [
    "Review this Google AI research about a UK pharmacy already accepted as having a public listing. Use your available web research if needed, but never invent a URL or price.",
    "Check whether direct official pages visibly name actual products, whether a GBP price belongs to the same named product, and whether erectile-dysfunction medicines are explicitly listed. A consultation, prescription-request form, service page, or starting price is not an exact priced product. Do not infer site-wide absence from one page.",
    "Output exactly one valid, single-line JSON object with these five keys in this order and no others: gphcNumber, status, productPages, evidenceUrls, reason.",
    `Use this exact shape, replacing the example values: {"gphcNumber":"${known.decision.gphcNumber}","status":"NEEDS_REVIEW","productPages":[],"evidenceUrls":[],"reason":"One plain-text sentence."}`,
    "gphcNumber must be the exact string shown above. status must be exactly ACCEPTED, REJECTED, or NEEDS_REVIEW. productPages and evidenceUrls must be JSON arrays of complete URL strings, never objects or null. reason must be one JSON string with internal quotation marks escaped.",
    "ACCEPTED means a cited official page lists a named product. REJECTED means the cited page is clearly only a service or prescription-request page, not that the whole pharmacy has no products. Otherwise use NEEDS_REVIEW. Include the cited service page in productPages when REJECTED. Only put URLs already present in the supplied Google evidence in productPages; if your research finds a new URL, leave it out and use NEEDS_REVIEW.",
    "Use double quotes around every key and string. Separate every key/value pair with a comma and colon; do not omit a colon, add a trailing comma, use comments, or wrap the JSON in Markdown fences. Do not write citations, explanatory prose, or any characters before or after the JSON object. Before responding, check that the complete output parses as JSON.",
    JSON.stringify({ known: known.decision, google: google.google?.responseText }),
  ].join("\n");
}

async function askChatgpt(known: KnownRow, google: GoogleRow): Promise<ChatgptDecision> {
  const context = await chromium.launchPersistentContext(profilePath, { channel: "chrome", headless: false, viewport: null, args: ["--start-maximized"] });
  try {
    const page = context.pages()[0] ?? await context.newPage();
    await gotoWithNetworkRetry(page, "https://chatgpt.com/", { waitUntil: "domcontentloaded", timeout: 60_000 });
    const input = page.locator('textarea:visible, [contenteditable="true"][role="textbox"]:visible, [contenteditable="true"]:visible').first();
    await input.fill(chatgptPrompt(known, google));
    await page.locator('button[data-testid="send-button"]:visible, button[aria-label*="Send" i]:visible').last().click();
    let previous = "";
    let stable = 0;
    const deadline = Date.now() + 10 * 60_000;
    let lastProgressAt = Date.now();
    while (Date.now() < deadline) {
      const body = await page.locator("body").innerText();
      if (/usage limit|rate limit|too many requests|limit reached/i.test(body)) throw new Error("CHATGPT_LIMIT_REACHED");
      if (/captcha|verify you are human|security check/i.test(body)) throw new Error("CHATGPT_MANUAL_REVIEW");
      const messages = page.locator('[data-message-author-role="assistant"]');
      const messageCount = await messages.count();
      const message = decisionJsonInPage(body, known.decision.gphcNumber) ||
        (messageCount ? normalizeChatgptDisplayText(await messages.last().innerText()) : "");
      stable = message && message === previous ? stable + 1 : 0;
      previous = message;
      const streaming = await page.locator('button[aria-label*="Stop" i]:visible, button[data-testid*="stop" i]:visible').count() > 0;
      if (stable >= (streaming ? 10 : 3)) {
        const value = JSON.parse(message) as ChatgptDecision;
        if (value.gphcNumber !== known.decision.gphcNumber || !["ACCEPTED", "REJECTED", "NEEDS_REVIEW"].includes(value.status) ||
          !Array.isArray(value.productPages) || !Array.isArray(value.evidenceUrls) || typeof value.reason !== "string") {
          throw new Error("ChatGPT returned an invalid known-pharmacy product audit.");
        }
        return value;
      }
      if (Date.now() - lastProgressAt >= 15_000) {
        stdout.write(`  Waiting for ChatGPT product audit: assistantMessages=${messageCount}, responseLength=${message.length}, stableReads=${stable}, streaming=${streaming}.\n`);
        lastProgressAt = Date.now();
      }
      await page.waitForTimeout(1_000);
    }
    throw new Error("ChatGPT did not complete the product audit within ten minutes.");
  } finally { await context.close(); }
}

function sameHost(left: string, right: string): boolean {
  const a = new URL(left).hostname.replace(/^www\./, "");
  const b = new URL(right).hostname.replace(/^www\./, "");
  return a === b || a.endsWith(`.${b}`);
}

async function auditPages(known: KnownRow, google: GoogleRow, review: ChatgptDecision): Promise<AuditRow> {
  const allowedUrls = googleUrls(google);
  const claimed = [...new Set(review.status === "REJECTED" && !review.productPages.length && known.decision.officialProductUrl && allowedUrls.has(known.decision.officialProductUrl)
    ? [known.decision.officialProductUrl] : review.productPages)];
  const products: AuditRow["products"] = [];
  const pageOutcomes: AuditClassification[] = [];
  const reasons: string[] = [];
  if (review.status === "NEEDS_REVIEW" || !claimed.length || claimed.length > 5) reasons.push("ChatGPT did not confirm one to five direct product pages.");
  for (const url of claimed.slice(0, 5)) {
    if (!URL.canParse(url) || !allowedUrls.has(url)) { reasons.push(`URL was absent from Google evidence: ${url}`); continue; }
    try {
      const page = await collectPublicWebsite(url);
      if (!sameHost(page.finalUrl, known.decision.officialWebsite ?? url) && !new RegExp(`\\b${known.decision.gphcNumber}\\b`).test(page.html)) {
        reasons.push(`Cross-domain page lacks the pharmacy registration number: ${page.finalUrl}`);
        continue;
      }
      const result = auditKnownProductPage(page.html, page.finalUrl);
      pageOutcomes.push(result.classification);
      reasons.push(`${page.finalUrl}: ${result.reason}`);
      products.push(...result.products.map(product => ({ ...product, url: page.finalUrl })));
    } catch (error) { reasons.push(`${url}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  let classification: AuditClassification = "NEEDS_REVIEW";
  if (review.status === "ACCEPTED" && pageOutcomes.includes("VERIFIED_PRICED_PRODUCTS")) classification = "VERIFIED_PRICED_PRODUCTS";
  else if (review.status === "ACCEPTED" && pageOutcomes.includes("PRODUCT_LISTED_PRICE_UNVERIFIED")) classification = "PRODUCT_LISTED_PRICE_UNVERIFIED";
  else if (review.status === "REJECTED" && pageOutcomes.length > 0 && pageOutcomes.every(item => item === "NO_PRODUCT_ON_CITED_PAGE")) classification = "NO_PRODUCT_ON_CITED_PAGE";
  return {
    schemaVersion: 1, gphcNumber: known.decision.gphcNumber, pharmacyName: known.decision.pharmacyName,
    classification, listedErectileDysfunctionProducts: products.filter(product => product.erectileDysfunction).length,
    pricedErectileDysfunctionProducts: products.filter(product => product.erectileDysfunction && product.priceGbp !== null).length,
    products, checkedAt: new Date().toISOString(), sourceKnownGoogleSequence: known.sourceGoogleSequence,
    sourceAuditGoogleSequence: google.sequence, citedUrls: claimed, chatgptStatus: review.status,
    reason: `${review.reason} ${reasons.join(" ")}`.trim(),
  };
}

async function auditKnownPageAfterNonJson(known: KnownRow, google: GoogleRow): Promise<AuditRow> {
  const url = known.decision.officialProductUrl;
  const base: AuditRow = {
    schemaVersion: 1, gphcNumber: known.decision.gphcNumber, pharmacyName: known.decision.pharmacyName,
    classification: "NEEDS_REVIEW", listedErectileDysfunctionProducts: 0, pricedErectileDysfunctionProducts: 0,
    products: [], checkedAt: new Date().toISOString(), sourceKnownGoogleSequence: known.sourceGoogleSequence,
    sourceAuditGoogleSequence: google.sequence, citedUrls: url ? [url] : [], chatgptStatus: "NEEDS_REVIEW",
    reason: "Google returned prose rather than the requested JSON; its claim was not treated as evidence of product absence.",
  };
  if (!url || !URL.canParse(url)) return base;
  try {
    const page = await collectPublicWebsite(url);
    if (!sameHost(page.finalUrl, known.decision.officialWebsite ?? url) && !new RegExp(`\\b${known.decision.gphcNumber}\\b`).test(page.html)) {
      return { ...base, reason: `${base.reason} The cited page redirected to an unverified operating domain.` };
    }
    const result = auditKnownProductPage(page.html, page.finalUrl);
    const products = result.products.map(product => ({ ...product, url: page.finalUrl }));
    return {
      ...base, classification: result.classification === "NO_PRODUCT_ON_CITED_PAGE" ? "NEEDS_REVIEW" : result.classification,
      products, citedUrls: [page.finalUrl],
      listedErectileDysfunctionProducts: products.filter(product => product.erectileDysfunction).length,
      pricedErectileDysfunctionProducts: products.filter(product => product.erectileDysfunction && product.priceGbp !== null).length,
      reason: `${base.reason} ${result.reason}`,
    };
  } catch (error) {
    return { ...base, reason: `${base.reason} Official-page check failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function main() {
  const limit = Number(option("--limit") ?? 10);
  if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit must be a positive whole number.");
  const selectedGphc = option("--gphc");
  const latestAudit = new Map(readJsonl<AuditRow>(ledgerPath).map(row => [row.gphcNumber, row]));
  const completed = new Set([...latestAudit.values()].filter(row =>
    !process.argv.includes("--retry-unresolved") || row.classification !== "NEEDS_REVIEW").map(row => row.gphcNumber));
  const pending = readJsonl<KnownRow>(knownPath).filter(row =>
    (!selectedGphc || row.decision.gphcNumber === selectedGphc) && !completed.has(row.decision.gphcNumber)).slice(0, limit);
  stdout.write(`${pending.length} accepted pharmacy candidate(s) queued for product-and-price audit.\n`);
  if (process.argv.includes("--dry-run")) {
    for (const row of pending) stdout.write(`${row.decision.gphcNumber} ${row.decision.pharmacyName} ${row.decision.officialProductUrl}\n`);
    return;
  }
  if (pending.length) await checkChatgptSignIn();
  for (const [index, known] of pending.entries()) {
    stdout.write(`[${index + 1}/${pending.length}] ${known.decision.pharmacyName} (${known.decision.gphcNumber})\n`);
    const query = `Check the cited page ${known.decision.officialProductUrl} and this pharmacy's official website ${known.decision.officialWebsite}. Find exact named products, public GBP prices tied to those products, pack/strength basis, and explicit ED medicine listings. Cite direct official product URLs. A consultation or prescription request is not a priced product.`;
    const prior = readJsonl<GoogleRow>(googlePath).findLast(row => ["RECEIVED", "NON_JSON"].includes(row.status) && row.candidate.gphcNumber === known.decision.gphcNumber && row.followUpQuery === query);
    const google = prior ?? await runGoogle(known.decision.gphcNumber, query);
    let result: AuditRow;
    try {
      if (google.status === "NON_JSON") result = await auditKnownPageAfterNonJson(known, google);
      else {
        const review = await askChatgpt(known, google);
        result = await auditPages(known, google, review);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "CHATGPT_LIMIT_REACHED" || message === "CHATGPT_MANUAL_REVIEW") throw error;
      result = {
        schemaVersion: 1, gphcNumber: known.decision.gphcNumber, pharmacyName: known.decision.pharmacyName,
        classification: "NEEDS_REVIEW", listedErectileDysfunctionProducts: 0, pricedErectileDysfunctionProducts: 0,
        products: [], checkedAt: new Date().toISOString(), sourceKnownGoogleSequence: known.sourceGoogleSequence,
        sourceAuditGoogleSequence: google.sequence, citedUrls: [], chatgptStatus: "NEEDS_REVIEW",
        reason: `The second-stage review could not be completed: ${message}`,
      };
    }
    saveAudit(result);
    stdout.write(`  ${result.classification}: ${result.products.length} named product/price row(s).\n`);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
