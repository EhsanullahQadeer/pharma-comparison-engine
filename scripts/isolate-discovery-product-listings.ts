import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";


import { assessProductListing, hasProductListingPath } from "./lib/product-listing-audit";
import { PrismaClient } from "../src/generated/prisma/client";
import { collectPublicWebsite } from "../src/lib/discovery/public-web";
import { openHumanBrowser, waitForHumanVerification } from "../src/lib/price-collection/human-browser";
import { collectCandidateUrls } from "../src/lib/product-detection/detect-products";

import type { Page } from "patchright";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const MAX_PRODUCT_PATHS_PER_CANDIDATE = 4;
const MAX_CONCURRENT_CANDIDATES = 24;
const HUMAN_PAGE_DELAY_MIN_MS = 3_000;
const HUMAN_PAGE_DELAY_MAX_MS = 9_000;
const humanAssist = process.argv.includes("--human");
const inputIndex = process.argv.indexOf("--input");
const humanInputPath = inputIndex === -1 ? undefined : process.argv[inputIndex + 1];
const browserRecoverablePattern = /human-verification|captcha|collection stopped \(HTTP 403\)|operation was aborted/i;

type AuditRecord = {
  candidateId: string;
  sourceRecordId: string;
  name: string;
  postcode: string | null;
  websiteDomain: string;
  status: string;
  classification: "PRODUCT_LISTING" | "PRESCRIPTION_FIRST" | "NO_PRODUCT_LISTING" | "INCONCLUSIVE";
  evidence: string[];
  inspectedUrls: string[];
};

type PreviousAudit = { inconclusive: { candidateId: string; evidence: string[] }[] };

function randomDelay(minMs: number, maxMs: number) {
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

async function waitForSettledNavigation(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await waitForHumanVerification(page, true);
}

function humanCandidateIds() {
  if (!humanInputPath) throw new Error("Human mode needs the prior report: npm run discovery:isolate-product-listings -- --human --input <results.json>");
  const audit = JSON.parse(readFileSync(humanInputPath, "utf8")) as PreviousAudit;
  return new Set(audit.inconclusive
    .filter(record => record.evidence.some(evidence => browserRecoverablePattern.test(evidence)))
    .map(record => record.candidateId));
}

async function collectHumanPage(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForSettledNavigation(page);
  const base = new URL(page.url());
  return page.evaluate(() => ({
    html: document.documentElement.outerHTML,
    links: [...document.querySelectorAll("a[href]")].map(anchor => (anchor as HTMLAnchorElement).href),
  })).then(({ html, links }) => ({
    html,
    links: [...new Set(links.filter((link) => {
      try { return new URL(link).hostname === base.hostname; } catch { return false; }
    }))],
  }));
}

async function assessCandidateWithHumanBrowser(candidate: { id: string; sourceRecordId: string; name: string; postcode: string | null; websiteDomain: string; status: string }, page: Page): Promise<AuditRecord> {
  const base = {
    candidateId: candidate.id,
    sourceRecordId: candidate.sourceRecordId,
    name: candidate.name,
    postcode: candidate.postcode,
    websiteDomain: candidate.websiteDomain,
    status: candidate.status,
  };
  try {
    const homepage = await collectHumanPage(page, "https://" + candidate.websiteDomain);
    const productUrls = homepage.links.filter(hasProductListingPath).slice(0, MAX_PRODUCT_PATHS_PER_CANDIDATE);
    const pages = [];
    for (const url of productUrls) {
      await page.waitForTimeout(randomDelay(HUMAN_PAGE_DELAY_MIN_MS, HUMAN_PAGE_DELAY_MAX_MS));
      pages.push({ url, html: (await collectHumanPage(page, url)).html });
    }
    const assessment = assessProductListing(homepage.html, pages);
    return { ...base, ...assessment, inspectedUrls: pages.map(item => item.url) };
  } catch (error) {
    return {
      ...base,
      classification: "INCONCLUSIVE",
      evidence: [error instanceof Error ? error.message : "Could not inspect this website in the browser."],
      inspectedUrls: [],
    };
  }
}

async function assessCandidate(candidate: { id: string; sourceRecordId: string; name: string; postcode: string | null; websiteDomain: string; status: string }): Promise<AuditRecord> {
  const base = {
    candidateId: candidate.id,
    sourceRecordId: candidate.sourceRecordId,
    name: candidate.name,
    postcode: candidate.postcode,
    websiteDomain: candidate.websiteDomain,
    status: candidate.status,
  };
  try {
    const homepage = await collectPublicWebsite(`https://${candidate.websiteDomain}`);
    const urls = await collectCandidateUrls(candidate.websiteDomain);
    const productUrls = urls.filter(hasProductListingPath).slice(0, MAX_PRODUCT_PATHS_PER_CANDIDATE);
    const pages = await Promise.all(productUrls.map(async (url) => ({ url, html: (await collectPublicWebsite(url)).html })));
    const assessment = assessProductListing(homepage.html, pages);
    return { ...base, ...assessment, inspectedUrls: pages.map(page => page.url) };
  } catch (error) {
    return {
      ...base,
      classification: "INCONCLUSIVE",
      evidence: [error instanceof Error ? error.message : "Could not inspect this website."],
      inspectedUrls: [],
    };
  }
}

async function main() {
  const candidates = await prisma.discoveryCandidate.findMany({
    where: { websiteDomain: { not: null }, status: "NEW" },
    select: { id: true, sourceRecordId: true, name: true, postcode: true, websiteDomain: true, status: true },
    orderBy: { discoveredAt: "asc" },
  });

  const websiteCandidates = candidates.filter((candidate): candidate is typeof candidate & { websiteDomain: string } => Boolean(candidate.websiteDomain));
  const records: AuditRecord[] = [];
  if (humanAssist) {
    const retryIds = humanCandidateIds();
    const retryCandidates = websiteCandidates.filter(candidate => retryIds.has(candidate.id));
    process.stdout.write("Human browser audit: " + retryCandidates.length + " recoverable candidates. Complete any visible verification in Chrome; the audit will continue automatically.\n");
    const humanBrowser = await openHumanBrowser({ preferCdp: false });
    try {
      for (const [index, candidate] of retryCandidates.entries()) {
        process.stdout.write("Checking " + (index + 1) + " of " + retryCandidates.length + ": " + candidate.name + " (" + candidate.websiteDomain + ")...\n");
        records.push(await assessCandidateWithHumanBrowser(candidate, humanBrowser.page));
        if (index < retryCandidates.length - 1) {
          await humanBrowser.page.waitForTimeout(randomDelay(HUMAN_PAGE_DELAY_MIN_MS, HUMAN_PAGE_DELAY_MAX_MS));
        }
      }
    } finally {
      await humanBrowser?.close();
    }
  } else {
    for (let start = 0; start < websiteCandidates.length; start += MAX_CONCURRENT_CANDIDATES) {
      const batch = websiteCandidates.slice(start, start + MAX_CONCURRENT_CANDIDATES);
      process.stdout.write("Checking candidates " + (start + 1) + "-" + (start + batch.length) + " of " + websiteCandidates.length + "...\n");
      records.push(...await Promise.all(batch.map(candidate => assessCandidate(candidate))));
    }
  }

  const groups = {
    productListings: records.filter(record => record.classification === "PRODUCT_LISTING"),
    prescriptionFirst: records.filter(record => record.classification === "PRESCRIPTION_FIRST"),
    noProductListing: records.filter(record => record.classification === "NO_PRODUCT_LISTING"),
    inconclusive: records.filter(record => record.classification === "INCONCLUSIVE"),
  };
  const output = { generatedAt: new Date().toISOString(), candidatesChecked: records.length, ...groups };
  const runDir = join(process.cwd(), "tmp", "discovery-product-listings", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(runDir, { recursive: true });
  const outputPath = join(runDir, "results.json");
  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");

  process.stdout.write("Product listings: " + groups.productListings.length + "\n");
  process.stdout.write("Prescription-first: " + groups.prescriptionFirst.length + "\n");
  process.stdout.write("No product listing: " + groups.noProductListing.length + "\n");
  process.stdout.write("Inconclusive: " + groups.inconclusive.length + "\n");
  process.stdout.write("Results -> " + outputPath + "\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
