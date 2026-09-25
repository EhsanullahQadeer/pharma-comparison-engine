import "dotenv/config";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { runCandidateEdCheck, type CandidateEdCheckResult } from "../src/lib/discovery/run-candidate-ed-check";

// Batch driver for the current NEW DiscoveryCandidate backlog — the actual per-candidate decision
// logic (URL-path ED token matching, promote/reject/flag rules) lives in
// src/lib/discovery/run-candidate-ed-check.ts, shared with the "Check for ED medicine"/"Human
// check" buttons on the Discovery candidates review queue, so a batch run and a one-off UI click
// can never drift apart. See that module's own comment for the full decision rule.
//
// `--human` retries only the candidates a previous run marked BLOCKED, one at a time, through the
// already-open Chrome debugging session (HUMAN_SCRAPE_CDP_URL/GOOGLE_AI_CDP_URL, default
// http://127.0.0.1:9222), requiring it rather than falling back to a separate automation profile —
// same pattern as scripts/isolate-discovery-product-listings.ts's --human mode, so it's genuinely
// the real Chrome window the user already has open. Staff clear any CAPTCHA there manually and the
// script continues automatically once the page is stable. `--input <path>` picks which prior run's
// results.json to retry from; defaults to the most recent run under tmp/ed-candidate-filter.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const MAX_CONCURRENT = 16;
const humanMode = process.argv.includes("--human");
const inputIndex = process.argv.indexOf("--input");
const explicitInputPath = inputIndex === -1 ? undefined : process.argv[inputIndex + 1];

type Candidate = { id: string; name: string; websiteDomain: string | null };
type Outcome = CandidateEdCheckResult | { kind: "BLOCKED"; reason: string };

async function processCandidate(candidate: Candidate, reviewerId: string, onProgress?: (message: string) => void): Promise<Outcome> {
  try {
    return await runCandidateEdCheck(candidate.id, humanMode, reviewerId, onProgress);
  } catch (error) {
    return { kind: "BLOCKED", reason: error instanceof Error ? error.message : "unknown error" };
  }
}

function latestResultsPath(): string | undefined {
  const root = join(process.cwd(), "tmp", "ed-candidate-filter");
  let dirs: string[];
  try {
    dirs = readdirSync(root).sort();
  } catch {
    return undefined;
  }
  const last = dirs.at(-1);
  return last ? join(root, last, "results.json") : undefined;
}

function blockedCandidateIds(path: string): Set<string> {
  const data = JSON.parse(readFileSync(path, "utf8")) as { results: { candidateId: string; outcome: { kind: string } }[] };
  return new Set(data.results.filter((record) => record.outcome.kind === "BLOCKED").map((record) => record.candidateId));
}

async function loadCandidates(): Promise<Candidate[]> {
  if (!humanMode) {
    return prisma.discoveryCandidate.findMany({ where: { status: "NEW" }, select: { id: true, name: true, websiteDomain: true } });
  }
  const inputPath = explicitInputPath ?? latestResultsPath();
  if (!inputPath) throw new Error("Human mode needs a prior run's results.json: npm run discovery:filter-ed-candidates -- --human --input <results.json>");
  const retryIds = blockedCandidateIds(inputPath);
  process.stdout.write(`Human retry: ${retryIds.size} candidates were BLOCKED in ${inputPath}.\n`);
  return prisma.discoveryCandidate.findMany({
    where: { status: "NEW", id: { in: [...retryIds] } },
    select: { id: true, name: true, websiteDomain: true },
  });
}

async function main() {
  const [reviewer, candidates] = await Promise.all([
    prisma.staffUser.findFirst({ where: { role: "ADMINISTRATOR" }, select: { id: true } }),
    loadCandidates(),
  ]);
  if (!reviewer) throw new Error("No administrator account is available to record the review.");
  const reviewerId = reviewer.id;

  const results: { candidateId: string; name: string; websiteDomain: string | null; outcome: Outcome }[] = [];

  if (humanMode) {
    process.stdout.write(`Human-assisted retry: ${candidates.length} candidates, one at a time through your open Chrome debugging session. Complete any visible verification in the browser window; the script continues automatically once the page is stable.\n`);
    for (const [index, candidate] of candidates.entries()) {
      const label = `${index + 1}/${candidates.length}`;
      process.stdout.write(`[${label}] ${candidate.name} (${candidate.websiteDomain ?? "no domain"})...\n`);
      const outcome = await processCandidate(candidate, reviewerId, (message) => process.stdout.write(`  [${label}] ${message}\n`));
      results.push({ candidateId: candidate.id, name: candidate.name, websiteDomain: candidate.websiteDomain, outcome });
      process.stdout.write(`[${label}] ${candidate.name} -> ${outcome.kind}\n`);
    }
  } else {
    let cursor = 0;
    async function worker() {
      while (cursor < candidates.length) {
        const candidate = candidates[cursor++];
        const outcome = await processCandidate(candidate, reviewerId);
        results.push({ candidateId: candidate.id, name: candidate.name, websiteDomain: candidate.websiteDomain, outcome });
        process.stdout.write(`[${results.length}/${candidates.length}] ${candidate.name} (${candidate.websiteDomain ?? "no domain"}) -> ${outcome.kind}\n`);
      }
    }
    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, candidates.length) }, worker));
  }

  const totals = { promoted: 0, needsGphc: 0, rejected: 0, blocked: 0 };
  for (const result of results) {
    if (result.outcome.kind === "PROMOTED") totals.promoted++;
    else if (result.outcome.kind === "NEEDS_GPHC") totals.needsGphc++;
    else if (result.outcome.kind === "REJECTED_NO_ED_MATCH") totals.rejected++;
    else totals.blocked++;
  }

  const runDir = join(process.cwd(), "tmp", "ed-candidate-filter", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, "results.json"), JSON.stringify({ totals, results }, null, 2));
  process.stdout.write("\n" + JSON.stringify(totals, null, 2) + "\nSaved: " + runDir + "\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());




// Quick Meds: Cloudflare kept looping, even after the check was completed. It detects the controlled browser.
// Pharmaceutra: its generic sildenafil and tadalafil pages had no matching pack, and a check on one page timed out. Its branded prices above are saved.
// Well: only subscription and "from" prices.
// Treated and Mail My Meds: prices aren't tied to a pack size, and Mail My Meds shows everything out of stock.
// e-Pharmacy and Crosshills: no per-pack price data.
// Prime Med and Rai's Pharmacy: the prices only appear after you pick options in their custom selector.
// Seriva, iPharm and Chemist2Door: nothing matching your products.
// Peak, Pharmica, Oxford Online and Your Medicals: their robots rules refuse automated access.