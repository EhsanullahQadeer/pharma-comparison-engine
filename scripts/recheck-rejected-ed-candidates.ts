import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { runCandidateEdCheck } from "../src/lib/discovery/run-candidate-ed-check";
import { detectEdProductMatches } from "../src/lib/product-detection/detect-products";

// One-off recovery for candidates rejected before sitemap indexes were followed. A candidate is
// reopened only when its own public URL paths now identify an ED product page. The normal shared
// check then performs the existing regulator gate, promotion and ProductMatch creation; offers
// are intentionally not created here because an exact strength and pack must first be identified.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const MAX_CONCURRENT = 8;
const inputIndex = process.argv.indexOf("--input");
const inputPath = inputIndex === -1 ? "tmp/ed-candidate-filter/2026-09-24T05-50-03-893Z/results.json" : process.argv[inputIndex + 1];

type Candidate = { id: string; name: string; websiteDomain: string | null };

type Result = {
  candidateId: string;
  name: string;
  websiteDomain: string | null;
  outcome: "REOPENED_AND_PROMOTED" | "REOPENED_NEEDS_GPHC" | "NO_ED_EVIDENCE" | "BLOCKED" | "RECHECK_REJECTED";
  detail?: string;
};

type PriorResult = { candidateId: string; outcome: { kind: string } };

function rejectedCandidateIds(): string[] {
  const prior = JSON.parse(readFileSync(inputPath, "utf8")) as { results: PriorResult[] };
  return prior.results
    .filter((result) => result.outcome.kind === "REJECTED_NO_ED_MATCH")
    .map((result) => result.candidateId);
}

function resultFor(candidate: Candidate, outcome: Result["outcome"], detail?: string): Result {
  return { candidateId: candidate.id, name: candidate.name, websiteDomain: candidate.websiteDomain, outcome, detail };
}

async function reopenCandidate(candidate: Candidate, reviewerId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.discoveryCandidate.update({
      where: { id: candidate.id },
      data: { status: "NEW", reviewedAt: null, reviewedByStaffId: null },
    });
    await tx.auditLog.create({
      data: {
        actorId: reviewerId,
        action: "UPDATE",
        entityType: "DiscoveryCandidate",
        entityId: candidate.id,
        changes: { status: "NEW", reason: "recheck after sitemap-index product detection fix" },
      },
    });
  });
}

async function recheck(candidate: Candidate, reviewerId: string): Promise<Result> {
  if (!candidate.websiteDomain) {
    return resultFor(candidate, "BLOCKED", "No website domain");
  }

  try {
    const matches = await detectEdProductMatches(candidate.websiteDomain);
    if (matches.length === 0) return resultFor(candidate, "NO_ED_EVIDENCE");

    await reopenCandidate(candidate, reviewerId);
    const outcome = await runCandidateEdCheck(candidate.id, false, reviewerId);
    const outcomeMap = {
      PROMOTED: "REOPENED_AND_PROMOTED",
      NEEDS_GPHC: "REOPENED_NEEDS_GPHC",
      REJECTED_NO_ED_MATCH: "RECHECK_REJECTED",
      BLOCKED: "BLOCKED",
    } as const;
    return resultFor(candidate, outcomeMap[outcome.kind], outcome.kind === "BLOCKED" ? outcome.reason : undefined);
  } catch (error) {
    return resultFor(candidate, "BLOCKED", error instanceof Error ? error.message : "Could not recheck this website.");
  }
}

async function main() {
  const [reviewer, candidates] = await Promise.all([
    prisma.staffUser.findFirst({ where: { role: "ADMINISTRATOR" }, select: { id: true } }),
    prisma.discoveryCandidate.findMany({
      where: { status: "REJECTED", id: { in: rejectedCandidateIds() } },
      select: { id: true, name: true, websiteDomain: true },
      orderBy: { discoveredAt: "asc" },
    }),
  ]);
  if (!reviewer) throw new Error("No administrator account is available to record this review.");
  const reviewerId = reviewer.id;

  const results: Result[] = [];
  const runDir = join(process.cwd(), "tmp", "ed-candidate-recheck", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(runDir, { recursive: true });
  const writeProgress = () => writeFileSync(
    join(runDir, "results.json"),
    JSON.stringify({ inputPath, totalCandidates: candidates.length, completedCandidates: results.length, results }, null, 2),
  );
  writeProgress();
  let cursor = 0;
  async function worker() {
    while (cursor < candidates.length) {
      const candidate = candidates[cursor++];
      const result = await recheck(candidate, reviewerId);
      results.push(result);
      writeProgress();
      process.stdout.write(`[${results.length}/${candidates.length}] ${result.name} -> ${result.outcome}\n`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, candidates.length) }, worker));

  const totals = results.reduce<Record<Result["outcome"], number>>((counts, result) => {
    counts[result.outcome] += 1;
    return counts;
  }, { REOPENED_AND_PROMOTED: 0, REOPENED_NEEDS_GPHC: 0, NO_ED_EVIDENCE: 0, BLOCKED: 0, RECHECK_REJECTED: 0 });
  writeFileSync(join(runDir, "results.json"), JSON.stringify({ inputPath, totalCandidates: candidates.length, completedCandidates: results.length, totals, results }, null, 2));
  process.stdout.write(`${JSON.stringify(totals, null, 2)}\nSaved: ${runDir}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
