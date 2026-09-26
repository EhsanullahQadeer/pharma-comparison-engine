import { runCandidateEdCheck, type CandidateEdCheckResult } from "@/lib/discovery/run-candidate-ed-check";
import { prisma } from "@/lib/prisma";

// Batch driver over the whole NEW DiscoveryCandidate backlog, behind the Discovery candidates
// queue's "Filter for ED medicine" button. Every per-candidate decision still goes
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

type BacklogCandidate = { id: string; name: string; websiteDomain: string | null };

// Two passes behind the single "Filter for ED medicine" button: a fast concurrent plain-fetch pass
// over the whole backlog, then a sequential human-assisted (patchright/Chrome) retry of only the
// candidates the plain pass couldn't check — so the visible browser only opens for sites that
// actually need it. Candidates with no website domain are never retried; a browser can't help them.
export async function runBacklogEdCheck(
  staffUserId: string,
  onProgress: BacklogEdCheckProgress = noopProgress,
): Promise<BacklogEdCheckResult> {
  const candidates = await prisma.discoveryCandidate.findMany({
    where: { status: "NEW" },
    select: { id: true, name: true, websiteDomain: true },
  });
  onProgress(`Found ${candidates.length} pending candidate${candidates.length === 1 ? "" : "s"} to check.`);

  const totals: BacklogEdCheckTotals = { promoted: 0, needsGphc: 0, rejected: 0, blocked: 0 };
  const blockedForRetry: BacklogCandidate[] = [];

  async function checkOne(candidate: BacklogCandidate, humanAssist: boolean) {
    onProgress(`Checking ${candidate.name} (${candidate.websiteDomain ?? "no domain"})${humanAssist ? " in the browser" : ""}…`);
    let kind: CandidateEdCheckResult["kind"] | "BLOCKED";
    let detail = "";
    try {
      kind = (await runCandidateEdCheck(candidate.id, humanAssist, staffUserId, (message) => onProgress(`${candidate.name}: ${message}`))).kind;
    } catch (error) {
      kind = "BLOCKED";
      detail = ` (${error instanceof Error ? error.message : "unknown error"})`;
    }
    if (kind === "BLOCKED" && !humanAssist && candidate.websiteDomain) {
      blockedForRetry.push(candidate);
      onProgress(`${candidate.name} -> BLOCKED${detail}, will retry in the browser`);
      return;
    }
    tally(totals, kind);
    onProgress(`${candidate.name} -> ${kind}${detail}`);
  }

  let cursor = 0;
  async function worker() {
    while (cursor < candidates.length) await checkOne(candidates[cursor++], false);
  }
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, candidates.length) }, worker));

  if (blockedForRetry.length > 0) {
    onProgress(`Retrying ${blockedForRetry.length} blocked site${blockedForRetry.length === 1 ? "" : "s"} in a visible Chrome window — complete any verification there.`);
    for (const candidate of blockedForRetry) await checkOne(candidate, true);
  }

  onProgress(`Finished — ${totals.promoted} promoted, ${totals.needsGphc} need a GPhC number, ${totals.rejected} rejected, ${totals.blocked} could not be checked.`);
  return { attempted: candidates.length, totals };
}
