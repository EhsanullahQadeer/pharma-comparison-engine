-- Shopper-facing pharmacy facts (Trustpilot, GPhC inspection, next-day delivery, discreet
-- packaging, payment methods), each group with its own checked-at date; and price alerts.
CREATE TYPE "InspectionOutcome" AS ENUM ('STANDARDS_MET', 'STANDARDS_NOT_ALL_MET', 'EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR');
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'APPLE_PAY', 'GOOGLE_PAY', 'PAYPAL', 'KLARNA');

ALTER TABLE "Provider"
  ADD COLUMN "trustpilotUrl" TEXT,
  ADD COLUMN "trustpilotScoreTenths" INTEGER,
  ADD COLUMN "trustpilotReviewCount" INTEGER,
  ADD COLUMN "trustpilotCheckedAt" TIMESTAMP(3),
  ADD COLUMN "inspectionOutcome" "InspectionOutcome",
  ADD COLUMN "inspectionDate" TIMESTAMP(3),
  ADD COLUMN "inspectionCheckedAt" TIMESTAMP(3),
  ADD COLUMN "nextDayDelivery" BOOLEAN,
  ADD COLUMN "discreetPackaging" BOOLEAN,
  ADD COLUMN "paymentMethods" "PaymentMethod"[],
  ADD COLUMN "serviceFactsCheckedAt" TIMESTAMP(3);

CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "strengthMg" INTEGER NOT NULL,
    "packQuantity" INTEGER NOT NULL,
    "thresholdPence" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "lastNotifiedAt" TIMESTAMP(3),
    "lastNotifiedPence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PriceAlert_token_key" ON "PriceAlert"("token");
CREATE INDEX "PriceAlert_email_idx" ON "PriceAlert"("email");
CREATE INDEX "PriceAlert_confirmedAt_idx" ON "PriceAlert"("confirmedAt");
