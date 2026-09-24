import { runCandidateEdCheck, type CandidateEdCheckResult } from "@/lib/discovery/run-candidate-ed-check";
import { prisma } from "@/lib/prisma";

// Batch driver over the whole NEW DiscoveryCandidate backlog, behind the Discovery candidates
// queue's "Filter for ED medicine"/"Human filter" buttons. Every per-candidate decision still goes
// through runCandidateEdCheck — the exact same function the single-row "Check for ED medicine"
// buttons and scripts/filter-discovery-candidates-by-ed-medicine.ts call — so this is purely a
// concurrency/aggregation wrapper, not a second copy of the decision rule (see that module's own
// comment for the full rule). The terminal script additionally writes a detailed JSON report to
// tmp/ and supports retrying just the BLOCKED subset via --human --input; this UI-facing path only
// needs live progress and a final tally, so it stays a separate, simpler loop rather than forcing
// the two to share file-I/O concerns they don't both need.

export type BacklogEdCheckProgress = (message: string) => void;
export type BacklogEdCheckTotals = { promoted: number; needsGphc: number; rejected: number; blocked: number };
export type BacklogEdCheckResult = { attempted: number; totals: BacklogEdCheckTotals };

const MAX_CONCURRENT = 16;
const noopProgress: BacklogEdCheckProgress = () => {};

function tally(totals: BacklogEdCheckTotals, kind: CandidateEdCheckResult["kind"] | "BLOCKED") {
  if (kind === "PROMOTED") totals.promoted++;
  else if (kind === "NEEDS_GPHC") totals.needsGphc++;
  else if (kind === "REJECTED_NO_ED_MATCH") totals.rejected++;
  else totals.blocked++;
}

export async function runBacklogEdCheck(
  humanAssist: boolean,
  staffUserId: string,
  onProgress: BacklogEdCheckProgress = noopProgress,
): Promise<BacklogEdCheckResult> {
  const candidates = await prisma.discoveryCandidate.findMany({
    where: { status: "NEW" },
    select: { id: true, name: true, websiteDomain: true },
  });
  onProgress(`Found ${candidates.length} pending candidate${candidates.length === 1 ? "" : "s"} to check.`);

  const totals: BacklogEdCheckTotals = { promoted: 0, needsGphc: 0, rejected: 0, blocked: 0 };

  async function checkOne(candidate: { id: string; name: string; websiteDomain: string | null }) {
    onProgress(`Checking ${candidate.name} (${candidate.websiteDomain ?? "no domain"})…`);
    try {
      const result = await runCandidateEdCheck(candidate.id, humanAssist, staffUserId, (message) => onProgress(`${candidate.name}: ${message}`));
      tally(totals, result.kind);
      onProgress(`${candidate.name} -> ${result.kind}`);
    } catch (error) {
      tally(totals, "BLOCKED");
      onProgress(`${candidate.name} -> BLOCKED (${error instanceof Error ? error.message : "unknown error"})`);
    }
  }

  if (humanAssist) {
    for (const candidate of candidates) await checkOne(candidate);
  } else {
    let cursor = 0;
    async function worker() {
      while (cursor < candidates.length) await checkOne(candidates[cursor++]);
    }
    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, candidates.length) }, worker));
  }

  onProgress(`Finished — ${totals.promoted} promoted, ${totals.needsGphc} need a GPhC number, ${totals.rejected} rejected, ${totals.blocked} could not be checked.`);
  return { attempted: candidates.length, totals };
}
