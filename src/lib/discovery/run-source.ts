import type { DiscoveryRunStatus, DiscoverySource } from "@/generated/prisma/client";
import { computeNextRunAt } from "@/lib/discovery/cadence";
import { decryptCredentials } from "@/lib/discovery/credentials-crypto";
import { findMatchingProvider } from "@/lib/discovery/identifier-match";
import { getAdapter } from "@/lib/discovery/registry";
import { prisma } from "@/lib/prisma";

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

  try {
    const adapter = getAdapter(source.type);
    const records = await adapter.run({
      config: source.config ?? null,
      lastRunAt: source.lastRunAt,
      credentials: decryptSourceCredentials(source),
    });

    for (const record of records) {
      await upsertCandidate(source.id, run.id, record);
      candidatesFound += 1;
    }
  } catch (error) {
    status = "FAILURE";
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  const finishedAt = new Date();
  const [updatedRun] = await Promise.all([
    prisma.discoveryRun.update({
      where: { id: run.id },
      data: { finishedAt, status, candidatesFound, errorMessage },
    }),
    prisma.discoverySource.update({
      where: { id: source.id },
      data: { lastRunAt: finishedAt, nextRunAt: computeNextRunAt(source.cadence, finishedAt) },
    }),
  ]);

  return updatedRun;
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
