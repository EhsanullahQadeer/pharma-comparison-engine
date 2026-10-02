import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { stdout } from "node:process";

import { classifyDistanceSellingCandidate, type CandidateForClassification, type LatestReview, type ReviewedDecision } from "./lib/distance-selling-classification";

type GoogleRecord = { sequence: number; candidate: { gphcNumber: string } };
type Review = { status: string; sourceGoogleSequence: number; receivedAt: string; decision?: ReviewedDecision };

function optionValue(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  return resolve(process.cwd(), index === -1 ? fallback : process.argv[index + 1]);
}

function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];
    try { return [JSON.parse(line) as T]; }
    catch { throw new Error(`Invalid JSONL in ${path} at line ${index + 1}.`); }
  });
}

function writeJsonl(path: string, records: unknown[]) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, records.map(record => JSON.stringify(record)).join("\n") + (records.length ? "\n" : ""), "utf8");
}

const googlePath = optionValue("--google", "tmp/distance-selling-google-ai-raw-results.jsonl");
const reviewsPath = optionValue("--reviews", "tmp/distance-selling-chatgpt-refined-results.jsonl");
const candidatesPath = optionValue("--candidates", "tmp/distance-selling-candidates-gphc-2026-06-30.json");
const knownPath = optionValue("--known", "tmp/distance-selling-known.jsonl");
const unknownPath = optionValue("--not-known", "tmp/distance-selling-not-known.jsonl");
const classifiedPath = optionValue("--classified", "tmp/distance-selling-classified.jsonl");
const summaryPath = optionValue("--summary", "tmp/distance-selling-category-summary.json");
const gphcBySequence = new Map(readJsonl<GoogleRecord>(googlePath).map(record => [record.sequence, record.candidate.gphcNumber]));
const latestByGphc = new Map<string, LatestReview>();
for (const record of readJsonl<Review>(reviewsPath)) {
  if (record.status !== "REVIEWED" || !record.decision) continue;
  const gphcNumber = gphcBySequence.get(record.sourceGoogleSequence);
  if (!gphcNumber || record.decision.gphcNumber !== gphcNumber) continue;
  latestByGphc.set(gphcNumber, {
    sourceGoogleSequence: record.sourceGoogleSequence,
    checkedAt: record.receivedAt,
    decision: record.decision,
  });
}
const decisions = [...latestByGphc.values()].sort((left, right) => left.sourceGoogleSequence - right.sourceGoogleSequence);
const known = decisions.filter(record => record.decision.status === "ACCEPTED" && Boolean(record.decision.officialProductUrl));
const notKnown = decisions.filter(record => !known.includes(record));
writeJsonl(knownPath, known);
writeJsonl(unknownPath, notKnown);
const candidates = (JSON.parse(readFileSync(candidatesPath, "utf8")) as { candidates: CandidateForClassification[] }).candidates;
const classified = candidates.map(candidate => classifyDistanceSellingCandidate(candidate, latestByGphc.get(candidate.gphcNumber)));
const countBy = (values: string[]) => Object.fromEntries([...new Set(values)].sort().map(value => [value, values.filter(item => item === value).length]));
const summary = {
  schemaVersion: 1,
  totalCandidates: classified.length,
  reviewedCandidates: classified.filter(record => record.researchStatus !== "UNRESEARCHED").length,
  researchStatus: countBy(classified.map(record => record.researchStatus)),
  classificationSource: countBy(classified.map(record => record.categories.classificationSource)),
  distanceSellingEvidence: countBy(classified.map(record => record.categories.distanceSellingEvidence)),
  publicListing: countBy(classified.map(record => record.categories.publicListing)),
  erectileDysfunction: countBy(classified.map(record => record.categories.erectileDysfunction)),
  listingBreadth: countBy(classified.map(record => record.categories.listingBreadth)),
  treatmentAreas: countBy(classified.flatMap(record => record.categories.treatmentAreas)),
  purchaseJourney: countBy(classified.map(record => record.categories.purchaseJourney)),
  fulfilmentMethods: countBy(classified.flatMap(record => record.categories.fulfilmentMethods)),
  deliveryCoverage: countBy(classified.map(record => record.categories.deliveryCoverage)),
  medicineSupply: countBy(classified.flatMap(record => record.categories.medicineSupply)),
  orderChannels: countBy(classified.flatMap(record => record.categories.orderChannels)),
  priceVisibility: countBy(classified.map(record => record.categories.priceVisibility)),
  needsManualReview: classified.filter(record => record.categories.needsManualReview).length,
};
writeJsonl(classifiedPath, classified);
mkdirSync(dirname(summaryPath), { recursive: true });
writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
stdout.write(`Known: ${known.length}; not-known: ${notKnown.length}; classified: ${classified.length}.\n`);
