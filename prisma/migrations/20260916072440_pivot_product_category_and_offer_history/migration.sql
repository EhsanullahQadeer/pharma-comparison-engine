/*
  Warnings:

  - Added the required column `category` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('ERECTILE_DYSFUNCTION', 'WEIGHT_LOSS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Ingredient" ADD VALUE 'TIRZEPATIDE';
ALTER TYPE "Ingredient" ADD VALUE 'SEMAGLUTIDE';

-- AlterTable
ALTER TABLE "PriceHistory" ADD COLUMN     "activeDiscountSnapshot" JSONB,
ADD COLUMN     "availability" "Availability" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "consultationFeePence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryFeePence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otherMandatoryFeesPence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
-- Existing rows predate the platform pivot and are all ED-vertical data (see
-- docs/milestones/00-platform-strategy.md) — backfill them to ERECTILE_DYSFUNCTION, then drop the
-- default so every future INSERT must choose a category explicitly rather than silently inheriting one.
ALTER TABLE "ProductVariant" ADD COLUMN     "category" "ProductCategory" NOT NULL DEFAULT 'ERECTILE_DYSFUNCTION';
ALTER TABLE "ProductVariant" ALTER COLUMN "category" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "ProductVariant_category_idx" ON "ProductVariant"("category");
