// Retry policy for scheduled price-collection jobs (milestone 5, roadmap §4.5): temporary failures
// retry after 5, 15 then 60 minutes with jitter; anything else goes straight to staff review.

const retryDelaysMinutes = [5, 15, 60];

// First run plus one retry per delay.
export const MAX_JOB_ATTEMPTS = retryDelaysMinutes.length + 1;

// How long a claimed job may run before another worker treats its owner as dead. Human-assisted
// jobs wait on a person completing a check in Chrome, so they get longer.
export const JOB_LEASE_MS = { automatic: 20 * 60_000, humanAssist: 60 * 60_000 };

// Network/server hiccups worth trying again. Robots refusals, CAPTCHA/verification pages, 4xx
// responses and "no matching price found" are not: repeating them only hammers the site.
const transientPatterns = [
  /timeout|timed out|aborted/i,
  /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|EPIPE|socket hang up/i,
  /HTTP (?:429|5\d\d)\b/,
  /Target page, context or browser has been closed|Could not open the price collection browser/i,
];

const humanVerificationPattern = /manual verification|human-verification|captcha|verify you are human|checking your browser/i;

export type JobFailureKind = "RETRY" | "HUMAN_VERIFICATION_REQUIRED" | "FAILED";

export function classifyJobFailure(message: string, attempts: number): JobFailureKind {
  if (humanVerificationPattern.test(message)) return "HUMAN_VERIFICATION_REQUIRED";
  if (attempts < MAX_JOB_ATTEMPTS && transientPatterns.some((pattern) => pattern.test(message))) return "RETRY";
  return "FAILED";
}

// `attempts` counts claims made so far, so the first retry (after attempt 1) waits 5 minutes.
// ±20% jitter stops jobs that failed together from retrying in lockstep against the same site.
export function retryDelayMs(attempts: number, random = Math.random) {
  const minutes = retryDelaysMinutes[Math.min(attempts, retryDelaysMinutes.length) - 1];
  return Math.round(minutes * 60_000 * (0.8 + random() * 0.4));
}
