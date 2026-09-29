import { collectPriceForMatch } from "@/actions/price-collection/collect-price";
import type { PriceCollectionJob } from "@/generated/prisma/client";
import { nextScrapeAt } from "@/lib/price-collection/cadence";
import { classifyJobFailure, JOB_LEASE_MS, MAX_JOB_ATTEMPTS, retryDelayMs } from "@/lib/price-collection/job-retry";
import { prisma } from "@/lib/prisma";

// Durable price-collection queue shared by the one-shot runner and the long-running worker.
// Every state change is a conditional update, so several workers (or an overlapping manual run)
// can share the table without collecting the same match twice.

export type CollectionRunOptions = {
  batchSize: number;
  humanAssist: boolean;
  // Checked between jobs so a shutdown finishes the current page instead of abandoning it.
  shouldStop?: () => boolean;
  log?: (message: string) => void;
};

export type CollectionRunSummary = { recovered: number; failedStale: number; enqueued: number; processed: number };

const staleRunning = (now: Date) => ({
  status: "RUNNING" as const,
  OR: [{ leaseExpiresAt: { lt: now } }, { leaseExpiresAt: null }],
});

// A RUNNING job past its lease belonged to a worker that died mid-run.
async function recoverExpiredLeases(now: Date) {
  const failed = await prisma.priceCollectionJob.updateMany({
    where: { ...staleRunning(now), attempts: { gte: MAX_JOB_ATTEMPTS } },
    data: { status: "FAILED", finishedAt: now, leaseExpiresAt: null, errorMessage: "Worker stopped before finishing and the job is out of attempts." },
  });
  const requeued = await prisma.priceCollectionJob.updateMany({
    where: staleRunning(now),
    data: { status: "QUEUED", scheduledFor: now, leaseExpiresAt: null, errorMessage: "Worker stopped before finishing; requeued." },
  });
  return { failedStale: failed.count, recovered: requeued.count };
}

// Moving `nextScrapeAt` on to the next cadence slot *is* the claim: only the process whose
// compare-and-set still sees the old value creates the job. This also stops a match whose
// collection keeps failing from being queued again on every tick.
async function enqueueDueJobs(now: Date, { batchSize, humanAssist }: CollectionRunOptions) {
  const due = await prisma.productMatch.findMany({
    where: { status: "CONFIRMED", scrapeEnabled: true, nextScrapeAt: { lte: now } },
    select: { id: true, nextScrapeAt: true, scrapeCadence: true },
    orderBy: { nextScrapeAt: "asc" },
    take: batchSize,
  });

  let enqueued = 0;
  for (const match of due) {
    const created = await prisma.$transaction(async (tx) => {
      const { count } = await tx.productMatch.updateMany({
        where: { id: match.id, nextScrapeAt: match.nextScrapeAt },
        data: { nextScrapeAt: nextScrapeAt(match.scrapeCadence, now), lastScrapeStatus: "READY" },
      });
      if (count === 0) return false;
      const active = await tx.priceCollectionJob.count({ where: { productMatchId: match.id, status: { in: ["QUEUED", "RUNNING"] } } });
      if (active > 0) return false;
      await tx.priceCollectionJob.create({ data: { productMatchId: match.id, scheduledFor: now, humanAssist } });
      return true;
    });
    if (created) enqueued += 1;
  }
  return enqueued;
}

// Claims one job at a time, just before running it, so its lease covers only its own run.
async function claimNextJob(): Promise<PriceCollectionJob | null> {
  for (;;) {
    const now = new Date();
    const job = await prisma.priceCollectionJob.findFirst({
      where: { status: "QUEUED", scheduledFor: { lte: now } },
      orderBy: { scheduledFor: "asc" },
    });
    if (!job) return null;

    const lease = job.humanAssist ? JOB_LEASE_MS.humanAssist : JOB_LEASE_MS.automatic;
    const { count } = await prisma.priceCollectionJob.updateMany({
      where: { id: job.id, status: "QUEUED" },
      data: { status: "RUNNING", startedAt: now, attempts: { increment: 1 }, leaseExpiresAt: new Date(now.getTime() + lease) },
    });
    // Another worker claimed it between the read and the update; try the next one.
    if (count === 1) return { ...job, status: "RUNNING", attempts: job.attempts + 1 };
  }
}

async function runJob(job: PriceCollectionJob, log: (message: string) => void) {
  // Only the worker still holding the claim may record the outcome.
  const finish = (data: Parameters<typeof prisma.priceCollectionJob.updateMany>[0]["data"]) =>
    prisma.priceCollectionJob.updateMany({ where: { id: job.id, status: "RUNNING" }, data: { leaseExpiresAt: null, ...data } });

  try {
    await collectPriceForMatch(job.productMatchId, { humanAssist: job.humanAssist });
    await finish({ status: "SUCCESS", finishedAt: new Date(), errorMessage: null });
    log(`Collected price for match ${job.productMatchId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Price collection failed.";
    const outcome = classifyJobFailure(message, job.attempts);
    if (outcome === "RETRY") {
      const retryAt = new Date(Date.now() + retryDelayMs(job.attempts));
      await finish({ status: "QUEUED", scheduledFor: retryAt, errorMessage: message });
      log(`Attempt ${job.attempts}/${MAX_JOB_ATTEMPTS} failed for match ${job.productMatchId}; retrying at ${retryAt.toISOString()}: ${message}`);
      return;
    }
    await finish({ status: outcome, finishedAt: new Date(), errorMessage: message });
    log(`Price collection ${outcome === "FAILED" ? "failed" : "needs human verification"} for match ${job.productMatchId}: ${message}`);
  }
}

export async function runDueCollection(options: CollectionRunOptions): Promise<CollectionRunSummary> {
  const log = options.log ?? console.warn;
  const now = new Date();
  const { recovered, failedStale } = await recoverExpiredLeases(now);
  const enqueued = await enqueueDueJobs(now, options);

  let processed = 0;
  while (processed < options.batchSize && !options.shouldStop?.()) {
    const job = await claimNextJob();
    if (!job) break;
    await runJob(job, log);
    processed += 1;
  }
  return { recovered, failedStale, enqueued, processed };
}
