-- AlterTable
ALTER TABLE "DiscoveryCandidate" ADD COLUMN     "lastSeenRunId" TEXT;

-- AddForeignKey
ALTER TABLE "DiscoveryCandidate" ADD CONSTRAINT "DiscoveryCandidate_lastSeenRunId_fkey" FOREIGN KEY ("lastSeenRunId") REFERENCES "DiscoveryRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
