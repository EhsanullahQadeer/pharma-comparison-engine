-- CreateEnum
CREATE TYPE "DiscoverySourceType" AS ENUM ('COMPANIES_HOUSE', 'CQC', 'NHS_ODS', 'NHSBSA_CONTRACTOR_DETAILS', 'GPHC');

-- CreateEnum
CREATE TYPE "DiscoveryCadence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "DiscoveryRunStatus" AS ENUM ('SUCCESS', 'FAILURE', 'PARTIAL');

-- CreateEnum
CREATE TYPE "DiscoveryCandidateStatus" AS ENUM ('NEW', 'LINKED_EXISTING', 'PROMOTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProviderIdentifierType" AS ENUM ('COMPANY_NUMBER', 'CQC_LOCATION_ID', 'ODS_CODE', 'GPHC_NUMBER');

-- CreateTable
CREATE TABLE "DiscoverySource" (
    "id" TEXT NOT NULL,
    "type" "DiscoverySourceType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "cadence" "DiscoveryCadence" NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoverySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "DiscoveryRunStatus",
    "candidatesFound" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "triggeredByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryCandidate" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "name" TEXT NOT NULL,
    "postcode" TEXT,
    "websiteDomain" TEXT,
    "companyNumber" TEXT,
    "cqcLocationId" TEXT,
    "odsCode" TEXT,
    "gphcNumber" TEXT,
    "status" "DiscoveryCandidateStatus" NOT NULL DEFAULT 'NEW',
    "matchedProviderId" TEXT,
    "reviewedByStaffId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderIdentifier" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "identifierType" "ProviderIdentifierType" NOT NULL,
    "value" TEXT NOT NULL,
    "source" "DiscoverySourceType",
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscoverySource_type_key" ON "DiscoverySource"("type");

-- CreateIndex
CREATE INDEX "DiscoverySource_enabled_nextRunAt_idx" ON "DiscoverySource"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "DiscoveryRun_sourceId_startedAt_idx" ON "DiscoveryRun"("sourceId", "startedAt");

-- CreateIndex
CREATE INDEX "DiscoveryCandidate_status_idx" ON "DiscoveryCandidate"("status");

-- CreateIndex
CREATE INDEX "DiscoveryCandidate_websiteDomain_idx" ON "DiscoveryCandidate"("websiteDomain");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryCandidate_sourceId_sourceRecordId_key" ON "DiscoveryCandidate"("sourceId", "sourceRecordId");

-- CreateIndex
CREATE INDEX "ProviderIdentifier_providerId_idx" ON "ProviderIdentifier"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderIdentifier_identifierType_value_key" ON "ProviderIdentifier"("identifierType", "value");

-- AddForeignKey
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "DiscoveryRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DiscoverySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "DiscoveryRun_triggeredByStaffId_fkey" FOREIGN KEY ("triggeredByStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryCandidate" ADD CONSTRAINT "DiscoveryCandidate_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DiscoverySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryCandidate" ADD CONSTRAINT "DiscoveryCandidate_matchedProviderId_fkey" FOREIGN KEY ("matchedProviderId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryCandidate" ADD CONSTRAINT "DiscoveryCandidate_reviewedByStaffId_fkey" FOREIGN KEY ("reviewedByStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderIdentifier" ADD CONSTRAINT "ProviderIdentifier_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
