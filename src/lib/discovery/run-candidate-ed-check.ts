import type { Prisma } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { HumanVerificationError, openHumanBrowser, waitForHumanVerification } from "@/lib/price-collection/human-browser";
import { prisma } from "@/lib/prisma";
import { detectEdProductMatches, type DetectedProductMatch } from "@/lib/product-detection/detect-products";
import { matchEdProductPath } from "@/lib/product-detection/ed-tokens";

import type { Page } from "playwright";

// The single-candidate orchestration behind the "Check for ED medicine"/"Human check" buttons on
// the Discovery candidates review queue (lives outside the "use server" actions file, same reason
// as run-variant-scrape.ts, so both the plain server action and the SSE progress route can call the
// exact same logic) — reuses the confirmed-provider product-detection matcher
// (matchEdProductPath: URL-path tokens only, never body text) rather than a second heuristic.
// Batch/unattended runs across the whole NEW backlog stay in
// scripts/filter-discovery-candidates-by-ed-medicine.ts, which now also imports this module.
//
// Mirrors scripts/filter-discovery-candidates-by-ed-medicine.ts's decision rule: ED products found
// + a verified GPhC number on file promotes straight to Provider (never-auto-publish-without-
// identity-evidence, per docs/current-tasks.md's 2026-09-23 entry — Provider.regulatorReference is
// required); ED products found but no GPhC number, or the site couldn't be checked at all
// (CAPTCHA/robots/network), leaves the candidate NEW with a rawPayload.edFilterAudit note so the
// review queue can flag it instead of silently doing nothing; no ED evidence and the site collected
// fine gets rejected.

export type CandidateEdCheckResult =
  | { kind: "PROMOTED"; matchedUrls: string[] }
  | { kind: "NEEDS_GPHC"; matchedUrls: string[] }
  | { kind: "REJECTED_NO_ED_MATCH" }
  | { kind: "BLOCKED"; reason: string };

export type CandidateEdCheckProgress = (message: string) => void;
const noopProgress: CandidateEdCheckProgress = () => {};

type CandidateWithSource = Prisma.DiscoveryCandidateGetPayload<{ include: { source: { select: { type: true } } } }>;

async function promote(candidate: CandidateWithSource, websiteDomain: string, reviewerId: string, gphcNumber: string, matches: DetectedProductMatch[]) {
  const matchedUrls = matches.map((match) => match.candidateUrl);
  const provider = await prisma.$transaction(async (tx) => {
    const created = await tx.provider.create({
      data: {
        legalName: candidate.name,
        tradingName: candidate.name,
        websiteDomain,
        regulatorType: "GPHC",
        regulatorReference: gphcNumber,
        serviceRegions: ["England"],
      },
    });
    const identifiers = [
      { identifierType: "GPHC_NUMBER" as const, value: gphcNumber },
      ...(candidate.odsCode ? [{ identifierType: "ODS_CODE" as const, value: candidate.odsCode }] : []),
    ];
    await tx.providerIdentifier.createMany({
      data: identifiers.map((identifier) => ({ ...identifier, providerId: created.id, source: candidate.source.type })),
      skipDuplicates: true,
    });
    await tx.evidence.create({
      data: {
        providerId: created.id,
        sourceUrl: `https://${websiteDomain}`,
        retrievedAt: candidate.discoveredAt,
        checkedAt: new Date(),
        reviewerId,
        approvedStatus: "APPROVED",
      },
    });
    // Detected ED pages become NEW ProductMatch rows so they land in the Reviews page's "Product
    // matches" queue for staff to pin to an exact variant — never auto-confirmed.
    await tx.productMatch.createMany({
      data: matches.map((match) => ({
        providerId: created.id,
        candidateUrl: match.candidateUrl,
        matchedIngredient: match.ingredient,
        matchedTokens: match.matchedTokens,
        confidence: match.confidence,
      })),
      skipDuplicates: true,
    });
    await tx.discoveryCandidate.update({
      where: { id: candidate.id },
      data: { status: "PROMOTED", matchedProviderId: created.id, reviewedByStaffId: reviewerId, reviewedAt: new Date() },
    });
    return created;
  });

  await recordAuditLog({ actorId: reviewerId, action: "CREATE", entityType: "Provider", entityId: provider.id, changes: { fromDiscoveryCandidateId: candidate.id, reason: "ed-medicine-filter", matchedUrls } });
  await recordAuditLog({ actorId: reviewerId, action: "UPDATE", entityType: "DiscoveryCandidate", entityId: candidate.id, changes: { status: "PROMOTED", providerId: provider.id, reason: "ed-medicine-filter" } });
}

async function reject(candidate: CandidateWithSource, reviewerId: string) {
  await prisma.discoveryCandidate.update({
    where: { id: candidate.id },
    data: { status: "REJECTED", reviewedByStaffId: reviewerId, reviewedAt: new Date() },
  });
  await recordAuditLog({ actorId: reviewerId, action: "UPDATE", entityType: "DiscoveryCandidate", entityId: candidate.id, changes: { status: "REJECTED", reason: "no ED medicine product listing found on candidate website" } });
}

async function flagForReview(candidate: CandidateWithSource, outcome: "BLOCKED" | "NEEDS_GPHC", detail: { reason?: string; matchedUrls?: string[] }) {
  const existingPayload = candidate.rawPayload && typeof candidate.rawPayload === "object" && !Array.isArray(candidate.rawPayload)
    ? candidate.rawPayload as Prisma.JsonObject
    : {};
  const existingAudit = existingPayload.edFilterAudit;
  const existingOutcome = existingAudit && typeof existingAudit === "object" && !Array.isArray(existingAudit)
    ? (existingAudit as Prisma.JsonObject).outcome
    : undefined;
  // Never downgrade a real "found ED evidence, just needs a GPhC number" finding to a mere
  // "couldn't check this time" note — a later recheck that hits the same CAPTCHA a human already
  // got past (or one that just fails to connect) is strictly less useful than the evidence already
  // on file, and overwriting it would silently throw away the matched product URLs.
  if (existingOutcome === "NEEDS_GPHC" && outcome === "BLOCKED") return;
  const edFilterAudit: Prisma.InputJsonValue = { outcome, checkedAt: new Date().toISOString(), ...detail };
  await prisma.discoveryCandidate.update({
    where: { id: candidate.id },
    data: { rawPayload: { ...existingPayload, edFilterAudit } },
  });
}

function sameOriginUrls(urls: string[], hostname: string): string[] {
  const filtered: string[] = [];
  for (const url of urls) {
    try {
      if (new URL(url).hostname === hostname) filtered.push(url);
    } catch {
      // Malformed/relative-scheme href — not a page to consider.
    }
  }
  return filtered;
}

async function collectHumanLinks(page: Page, url: string, onProgress: CandidateEdCheckProgress): Promise<string[]> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForHumanVerification(page, true, (elapsedSeconds) => {
    onProgress(`Still waiting for verification (${elapsedSeconds}s elapsed) — complete it in the Chrome window.`);
  });
  const base = new URL(page.url());
  const hrefs = await page.evaluate(() => [...document.querySelectorAll("a[href]")].map((anchor) => (anchor as HTMLAnchorElement).href));
  return sameOriginUrls(hrefs, base.hostname);
}

async function collectHumanSitemapLinks(page: Page, base: URL): Promise<string[]> {
  try {
    await page.goto(new URL("/sitemap.xml", base).href, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await waitForHumanVerification(page, true);
    const xml = await page.evaluate(() => document.documentElement.outerHTML);
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => match[1]);
    return sameOriginUrls(locs, base.hostname);
  } catch {
    return [];
  }
}

async function detectViaHumanBrowser(websiteDomain: string, page: Page, onProgress: CandidateEdCheckProgress): Promise<DetectedProductMatch[]> {
  const homepageLinks = await collectHumanLinks(page, `https://${websiteDomain}`, onProgress);
  const base = new URL(page.url());
  const sitemapLinks = await collectHumanSitemapLinks(page, base);
  const matches = new Map<string, DetectedProductMatch>();
  for (const url of new Set([...homepageLinks, ...sitemapLinks])) {
    try {
      const match = matchEdProductPath(new URL(url).pathname);
      if (match) matches.set(url, { candidateUrl: url, ...match });
    } catch {
      // Malformed URL — skip it.
    }
  }
  return [...matches.values()];
}

export async function runCandidateEdCheck(
  candidateId: string,
  humanAssist: boolean,
  staffUserId: string,
  onProgress: CandidateEdCheckProgress = noopProgress,
): Promise<CandidateEdCheckResult> {
  onProgress("Loading candidate details…");
  const candidate = await prisma.discoveryCandidate.findUnique({
    where: { id: candidateId },
    include: { source: { select: { type: true } } },
  });
  if (!candidate) throw new Error("Discovery candidate not found.");
  if (candidate.status !== "NEW") throw new Error("This candidate has already been reviewed.");
  if (!candidate.websiteDomain) {
    await flagForReview(candidate, "BLOCKED", { reason: "no website domain" });
    return { kind: "BLOCKED", reason: "no website domain" };
  }

  const humanBrowser = humanAssist ? await openHumanBrowser() : undefined;
  if (humanAssist) onProgress("Opened the scraping browser. Complete any verification prompts as they appear.");
  try {
    onProgress(`Checking ${candidate.websiteDomain} for ED medicine…`);
    let matches: DetectedProductMatch[];
    try {
      matches = humanBrowser
        ? await detectViaHumanBrowser(candidate.websiteDomain, humanBrowser.page, onProgress)
        : await detectEdProductMatches(candidate.websiteDomain);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Could not check this website.";
      // Flagged even for a verification timeout — a batch run must move on to the next candidate,
      // and the reviewer should still see "needs manual check" next time they open this row rather
      // than the flag silently never being written because this particular error gets rethrown.
      await flagForReview(candidate, "BLOCKED", { reason });
      if (error instanceof HumanVerificationError) throw error;
      onProgress(`Could not check this site: ${reason}`);
      return { kind: "BLOCKED", reason };
    }

    if (matches.length === 0) {
      await reject(candidate, staffUserId);
      onProgress("No ED medicine evidence found — rejected.");
      return { kind: "REJECTED_NO_ED_MATCH" };
    }

    const matchedUrls = matches.map((match) => match.candidateUrl);
    onProgress(`Found ${matches.length} ED product page${matches.length === 1 ? "" : "s"}.`);
    if (!candidate.gphcNumber) {
      await flagForReview(candidate, "NEEDS_GPHC", { matchedUrls });
      onProgress("No GPhC number on file — flagged for manual review instead of promoting.");
      return { kind: "NEEDS_GPHC", matchedUrls };
    }

    await promote(candidate, candidate.websiteDomain, staffUserId, candidate.gphcNumber, matches);
    onProgress("Promoted to a new pharmacy provider.");
    return { kind: "PROMOTED", matchedUrls };
  } finally {
    await humanBrowser?.close();
  }
}
