import type { DiscoveryRunStatus, DiscoverySource } from "@/generated/prisma/client";
import { computeNextRunAt } from "@/lib/discovery/cadence";
import { decryptCredentials } from "@/lib/discovery/credentials-crypto";
import { enrichWithDeepSeekWeb } from "@/lib/discovery/deepseek-web-enrichment";
import { assignedEnrichmentWorker } from "@/lib/discovery/enrichment-worker";
import { enrichWithGoogleAi } from "@/lib/discovery/google-ai-enrichment";
import { findMatchingProvider } from "@/lib/discovery/identifier-match";
import { getAdapter } from "@/lib/discovery/registry";
import { prisma } from "@/lib/prisma";
import type { NormalizedCandidate } from "@/types/discovery";

// Undecryptable/unset credentials degrade to null rather than aborting the run — the adapter's own
// "not configured" error (env var fallback missing too) already produces a clear FAILURE message,
// so a source using only an env var still works even if no encryption key is set at all.
function decryptSourceCredentials(source: DiscoverySource): Record<string, string> | null {
  if (!source.credentialsCiphertext) return null;
  try {
    return decryptCredentials(source.credentialsCiphertext);
  } catch {
    return null;
  }
}

// Shared orchestration for both the cron route handler and the staff "Run now" action. Never lets
// one bad adapter crash a batch — a thrown error (including a stub adapter's
// DiscoveryAdapterNotImplementedError) becomes a visible FAILURE run, not a silent no-op.
export async function runSource(source: DiscoverySource, options?: { triggeredByStaffId?: string }) {
  const run = await prisma.discoveryRun.create({
    data: { sourceId: source.id, triggeredByStaffId: options?.triggeredByStaffId },
  });

  let candidatesFound = 0;
  let status: DiscoveryRunStatus = "SUCCESS";
  let errorMessage: string | undefined;
  let requestSummary: string | undefined;

  try {
    const adapter = getAdapter(source.type);
    const records = await adapter.run({
      config: source.config ?? null,
      lastRunAt: source.lastRunAt,
      credentials: decryptSourceCredentials(source),
      recordRequest: (summary) => { requestSummary = summary; },
    });

    // A serial queue per browser-backed worker avoids flooding either search session. The queues
    // themselves run concurrently, and the stable assignment means no pharmacy reaches both bots.
    const queues = { GOOGLE_AI_MODE: [] as NormalizedCandidate[], DEEPSEEK_WEB: [] as NormalizedCandidate[] };
    for (const record of records) {
      if (!await isDuplicate(source.id, record)) queues[assignedEnrichmentWorker(source.id, record)].push(record);
    }
    const counts = await Promise.all(Object.entries(queues).map(async ([worker, queue]) => {
      let count = 0;
      for (const record of queue) {
        const enriched = await ({
          GOOGLE_AI_MODE: () => enrichWithGoogleAi(record),
          DEEPSEEK_WEB: () => enrichWithDeepSeekWeb(record),
        }[worker as keyof typeof queues])();
        if (!enriched || await isDuplicate(source.id, enriched)) continue;
        await upsertCandidate(source.id, run.id, enriched);
        count += 1;
      }
      return count;
    }));
    candidatesFound = counts.reduce((total, count) => total + count, 0);
  } catch (error) {
    status = "FAILURE";
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  const finishedAt = new Date();
  const [updatedRun] = await Promise.all([
    prisma.discoveryRun.update({
      where: { id: run.id },
      data: { finishedAt, status, candidatesFound, errorMessage, requestSummary },
    }),
    prisma.discoverySource.update({
      where: { id: source.id },
      data: { nextRunAt: computeNextRunAt(source.cadence, finishedAt) },
    }),
  ]);

  return updatedRun;
}

// Keep the source cursor unchanged while enrichment can skip records that need manual review.
// Advancing it would silently skip records that may qualify once AI/search evidence improves.
async function isDuplicate(sourceId: string, record: NormalizedCandidate) {
  if (await findMatchingProvider(record)) return true;
  if (record.websiteDomain && await prisma.provider.findUnique({ where: { websiteDomain: record.websiteDomain }, select: { id: true } })) return true;
  const identifiers = ["companyNumber", "cqcLocationId", "odsCode", "gphcNumber", "websiteDomain"] as const;
  return Boolean(await prisma.discoveryCandidate.findFirst({
    where: { OR: [
      { sourceId, sourceRecordId: record.sourceRecordId },
      ...identifiers.flatMap(field => record[field] ? [{ [field]: record[field] }] : []),
    ] },
    select: { id: true },
  }));
}

async function upsertCandidate(sourceId: string, runId: string, record: Awaited<ReturnType<ReturnType<typeof getAdapter>["run"]>>[number]) {
  const matchedProviderId = await findMatchingProvider(record);
  const resolvedStatus = matchedProviderId ? "LINKED_EXISTING" : "NEW";
  const fields = {
    rawPayload: record.rawPayload,
    name: record.name,
    postcode: record.postcode,
    websiteDomain: record.websiteDomain,
    companyNumber: record.companyNumber,
    cqcLocationId: record.cqcLocationId,
    odsCode: record.odsCode,
    gphcNumber: record.gphcNumber,
    lastSeenRunId: runId,
  };

  const existing = await prisma.discoveryCandidate.findUnique({
    where: { sourceId_sourceRecordId: { sourceId, sourceRecordId: record.sourceRecordId } },
    select: { id: true, status: true },
  });

  if (!existing) {
    await prisma.discoveryCandidate.create({
      data: { sourceId, sourceRecordId: record.sourceRecordId, ...fields, status: resolvedStatus, matchedProviderId },
    });
    return;
  }

  // A staff member already promoted or rejected this candidate — a re-run must not undo that
  // decision, so leave it alone rather than resetting status/matchedProviderId (but still record
  // that this run saw it, so it's excluded from that run's "what did I find" result rather than
  // silently vanishing from the count).
  if (existing.status !== "NEW" && existing.status !== "LINKED_EXISTING") {
    await prisma.discoveryCandidate.update({ where: { id: existing.id }, data: { lastSeenRunId: runId } });
    return;
  }

  await prisma.discoveryCandidate.update({
    where: { id: existing.id },
    data: { ...fields, status: resolvedStatus, matchedProviderId },
  });
}
