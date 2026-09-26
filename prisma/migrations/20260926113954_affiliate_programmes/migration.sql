-- CreateEnum
CREATE TYPE "AffiliateNetwork" AS ENUM ('AWIN', 'CJ', 'IMPACT', 'DIRECT', 'OTHER');

-- CreateEnum
CREATE TYPE "AffiliateProgrammeStatus" AS ENUM ('APPLIED', 'ACTIVE', 'PAUSED', 'REJECTED', 'ENDED');

-- CreateEnum
CREATE TYPE "CommissionBasis" AS ENUM ('FIXED', 'PERCENT');

-- AlterTable
ALTER TABLE "ReferralClick" ADD COLUMN     "programmeId" TEXT;

-- CreateTable
CREATE TABLE "AffiliateProgramme" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "network" "AffiliateNetwork" NOT NULL,
    "networkMerchantId" TEXT,
    "status" "AffiliateProgrammeStatus" NOT NULL DEFAULT 'APPLIED',
    "linkTemplate" TEXT NOT NULL,
    "commissionBasis" "CommissionBasis" NOT NULL,
    "commissionValue" INTEGER NOT NULL,
    "attributionDays" INTEGER,
    "termsUrl" TEXT,
    "termsNotes" TEXT,
    "pomPromotionPermitted" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateProgramme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateProgramme_providerId_key" ON "AffiliateProgramme"("providerId");

-- CreateIndex
CREATE INDEX "AffiliateProgramme_status_idx" ON "AffiliateProgramme"("status");

-- AddForeignKey
ALTER TABLE "AffiliateProgramme" ADD CONSTRAINT "AffiliateProgramme_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralClick" ADD CONSTRAINT "ReferralClick_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "AffiliateProgramme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
