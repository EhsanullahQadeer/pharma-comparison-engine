import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stdout } from "node:process";

type Candidate = {
  distanceSellingSignal: "HIGH" | "SUPPORTING";
  gphcNumber: string;
  tradingName: string;
};
type GoogleRecord = {
  sequence: number;
  status: string;
  kind?: "INITIAL" | "FOLLOW_UP";
  prompt: string;
  followUpQuery?: string;
  candidate: Candidate;
  google?: { responseText: string };
  error?: string;
};
type ReviewRecord = {
  status: string;
  sourceGoogleSequence: number;
  decision?: {
    gphcNumber: string;
    status: "ACCEPTED" | "REJECTED" | "NEEDS_REVIEW";
    followUpGoogleQuery: string | null;
  };
  error?: string;
};

const sessionStatuses = new Set(["LIMIT_REACHED", "MANUAL_REVIEW"]);

class CandidateSkipError extends Error {}

const taskRoot = process.cwd();
const tsxCli = resolve(taskRoot, "node_modules/tsx/dist/cli.mjs");
const googlePath = resolve(taskRoot, "tmp/distance-selling-google-ai-raw-results.jsonl");
const reviewsPath = resolve(taskRoot, "tmp/distance-selling-chatgpt-refined-results.jsonl");
const candidatesPath = resolve(taskRoot, "tmp/distance-selling-candidates-gphc-2026-06-30.json");
const knownPath = resolve(taskRoot, "tmp/distance-selling-known.jsonl");
const notKnownPath = resolve(taskRoot, "tmp/distance-selling-not-known.jsonl");

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

function positiveLimit() {
  if (process.argv.includes("--all")) return Number.MAX_SAFE_INTEGER;
  const value = Number(option("--limit") ?? 10);
  if (!Number.isInteger(value) || value < 1) throw new Error("--limit must be a positive whole number.");
  return value;
}

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];
    try { return [JSON.parse(line) as T]; }
    catch { throw new Error(`Invalid JSONL in ${path} at line ${index + 1}.`); }
  });
}

let googleRecords = readJsonl<GoogleRecord>(googlePath);
let reviewRecords = readJsonl<ReviewRecord>(reviewsPath);

function latestGoogle(gphcNumber: string, kind: "INITIAL" | "FOLLOW_UP") {
  return googleRecords.findLast(record =>
    record.status === "RECEIVED" &&
    record.google?.responseText &&
    record.candidate.gphcNumber === gphcNumber &&
    (kind === "INITIAL" ? record.kind !== "FOLLOW_UP" : record.kind === "FOLLOW_UP")
  );
}

function reviewFor(record: GoogleRecord) {
  return reviewRecords.findLast(review =>
    review.status === "REVIEWED" &&
    review.sourceGoogleSequence === record.sequence &&
    review.decision?.gphcNumber === record.candidate.gphcNumber
  );
}

function currentDecision(gphcNumber: string) {
  const followUp = latestGoogle(gphcNumber, "FOLLOW_UP");
  if (followUp) {
    const reviewed = reviewFor(followUp);
    return { google: followUp, reviewed, followUpDone: true };
  }
  const initial = latestGoogle(gphcNumber, "INITIAL");
  if (!initial) return null;
  const reviewed = reviewFor(initial);
  return { google: initial, reviewed, followUpDone: Boolean(followUp) };
}

function isFinalized(gphcNumber: string) {
  const current = currentDecision(gphcNumber);
  const decision = current?.reviewed?.decision;
  if (!decision) return false;
  return decision.status !== "NEEDS_REVIEW" || current.followUpDone || !decision.followUpGoogleQuery;
}

async function runScript(script: string, args: string[], allowExitCodes: number[] = []) {
  stdout.write(`Running ${script} ${args.join(" ")}\n`);
  const exitCode = await new Promise<number>((finish, reject) => {
    const child = spawn(process.execPath, [tsxCli, resolve(taskRoot, script), ...args], {
      cwd: taskRoot,
      stdio: "inherit",
      windowsHide: false,
    });
    child.on("error", reject);
    child.on("close", code => finish(code ?? 1));
  });
  if (exitCode !== 0 && !allowExitCodes.includes(exitCode)) throw new Error(`${script} stopped with exit code ${exitCode}.`);
  if (script === "scripts/research-distance-selling-websites.ts") googleRecords = readJsonl<GoogleRecord>(googlePath);
  if (script === "scripts/review-distance-selling-google-results.ts") reviewRecords = readJsonl<ReviewRecord>(reviewsPath);
}

async function exportDecisions() {
  await runScript("scripts/split-distance-selling-decisions.ts", [
    "--google", googlePath,
    "--reviews", reviewsPath,
    "--known", knownPath,
    "--not-known", notKnownPath,
  ]);
}

function latestGoogleAny(gphcNumber: string, kind: "INITIAL" | "FOLLOW_UP") {
  return googleRecords.findLast(record =>
    record.candidate.gphcNumber === gphcNumber &&
    (kind === "INITIAL" ? record.kind !== "FOLLOW_UP" : record.kind === "FOLLOW_UP")
  );
}

function assertNotSessionStopped(record: GoogleRecord | ReviewRecord | undefined, gphcNumber: string, source: "Google research" | "ChatGPT review") {
  if (record && sessionStatuses.has(record.status)) {
    throw new Error(`${source} stopped (${record.status}) for ${gphcNumber}. Fix the browser session, then retry.`);
  }
}

async function researchInitial(candidate: Candidate) {
  await runScript("scripts/research-distance-selling-websites.ts", [
    "--input", candidatesPath,
    "--output", googlePath,
    "--profile", option("--google-profile") ?? "tmp/price-collection-human-browser",
    "--gphc", candidate.gphcNumber,
    "--limit", "1",
  ], [2]);
  const result = latestGoogle(candidate.gphcNumber, "INITIAL");
  if (result) return result;
  const latest = latestGoogleAny(candidate.gphcNumber, "INITIAL");
  assertNotSessionStopped(latest, candidate.gphcNumber, "Google research");
  throw new CandidateSkipError(`Google did not save completed research for ${candidate.gphcNumber}${latest?.error ? `: ${latest.error}` : "."}`);
}

async function reviewGoogle(record: GoogleRecord) {
  await runScript("scripts/review-distance-selling-google-results.ts", [
    "--input", googlePath,
    "--output", reviewsPath,
    "--profile", option("--chatgpt-profile") ?? "tmp/price-collection-human-browser",
    "--source-sequence", String(record.sequence),
    "--limit", "1",
  ], [2]);
  const result = reviewFor(record);
  if (result?.decision) return result;
  const latest = reviewRecords.findLast(review => review.sourceGoogleSequence === record.sequence);
  assertNotSessionStopped(latest, record.candidate.gphcNumber, "ChatGPT review");
  throw new CandidateSkipError(`ChatGPT did not save a valid decision for ${record.candidate.gphcNumber}${latest?.error ? `: ${latest.error}` : "."}`);
}

async function researchFollowUp(candidate: Candidate, query: string) {
  await runScript("scripts/research-distance-selling-websites.ts", [
    "--input", candidatesPath,
    "--output", googlePath,
    "--profile", option("--google-profile") ?? "tmp/price-collection-human-browser",
    "--gphc", candidate.gphcNumber,
    "--query", query,
    "--limit", "1",
  ], [2]);
  const result = latestGoogle(candidate.gphcNumber, "FOLLOW_UP");
  if (result && result.followUpQuery === query) return result;
  const latest = latestGoogleAny(candidate.gphcNumber, "FOLLOW_UP");
  assertNotSessionStopped(latest, candidate.gphcNumber, "Google research");
  throw new CandidateSkipError(`Google did not save the follow-up for ${candidate.gphcNumber}${latest?.error ? `: ${latest.error}` : "."}`);
}

async function processCandidate(candidate: Candidate) {
  let google = latestGoogle(candidate.gphcNumber, "INITIAL") ?? await researchInitial(candidate);
  let review = reviewFor(google) ?? await reviewGoogle(google);
  let decision = review.decision!;
  if (decision.status !== "NEEDS_REVIEW" || !decision.followUpGoogleQuery) return;

  google = latestGoogle(candidate.gphcNumber, "FOLLOW_UP") ?? await researchFollowUp(candidate, decision.followUpGoogleQuery);
  review = reviewFor(google) ?? await reviewGoogle(google);
  decision = review.decision!;
  stdout.write(`Final decision for ${candidate.gphcNumber}: ${decision.status}\n`);
}

async function main() {
  const limit = positiveLimit();
  const selectedGphc = option("--gphc");
  const input = JSON.parse(readFileSync(candidatesPath, "utf8")) as { candidates: Candidate[] };
  if (selectedGphc && !input.candidates.some(candidate => candidate.gphcNumber === selectedGphc)) {
    throw new Error(`GPhC ${selectedGphc} is not in the candidate export.`);
  }
  const rank = { HIGH: 0, SUPPORTING: 1 } as const;
  const pending = input.candidates
    .filter(candidate => (!selectedGphc || candidate.gphcNumber === selectedGphc) && !isFinalized(candidate.gphcNumber))
    .sort((left, right) => rank[left.distanceSellingSignal] - rank[right.distanceSellingSignal])
    .slice(0, limit);
  stdout.write(`${pending.length} pharmacy candidate(s) queued.\n`);
  if (process.argv.includes("--dry-run")) {
    for (const candidate of pending) stdout.write(`${candidate.gphcNumber} ${candidate.tradingName}\n`);
    return;
  }
  if (pending.length) {
    try {
      await runScript("scripts/review-distance-selling-google-results.ts", [
        "--profile", option("--chatgpt-profile") ?? "tmp/price-collection-human-browser",
        "--check-sign-in",
      ]);
    } catch {
      throw new Error("ChatGPT session could not be verified in the workflow profile. Run npm.cmd run discovery:chatgpt-sign-in, complete sign-in in that window, then retry. No Google query was sent.");
    }
  }
  try {
    for (const [index, candidate] of pending.entries()) {
      stdout.write(`[${index + 1}/${pending.length}] ${candidate.tradingName} (${candidate.gphcNumber})\n`);
      try {
        await processCandidate(candidate);
      } catch (error) {
        if (!(error instanceof CandidateSkipError)) throw error;
        stdout.write(`  Skipping ${candidate.gphcNumber}: ${error.message}\n`);
      }
      await exportDecisions();
    }
  } catch (error) {
    await exportDecisions();
    throw error;
  }
  if (!pending.length) await exportDecisions();
  stdout.write(`Batch complete. Run the same command again to resume remaining candidates.\n`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
