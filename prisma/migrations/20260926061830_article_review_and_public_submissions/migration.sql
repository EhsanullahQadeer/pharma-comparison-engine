-- CreateEnum
CREATE TYPE "PublicSubmissionKind" AS ENUM ('PHARMACY_SUGGESTION', 'CONTACT');

-- CreateEnum
CREATE TYPE "PublicSubmissionStatus" AS ENUM ('NEW', 'HANDLED', 'SPAM');

-- AlterEnum
ALTER TYPE "ArticleStatus" ADD VALUE 'IN_REVIEW';

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "body" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "keyFacts" TEXT[],
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "summary" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "PublicSubmission" (
    "id" TEXT NOT NULL,
    "kind" "PublicSubmissionKind" NOT NULL,
    "status" "PublicSubmissionStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT,
    "email" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "pharmacyName" TEXT,
    "websiteUrl" TEXT,
    "regulatorReference" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicSubmission_kind_status_idx" ON "PublicSubmission"("kind", "status");

-- AddForeignKey
ALTER TABLE "PublicSubmission" ADD CONSTRAINT "PublicSubmission_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
