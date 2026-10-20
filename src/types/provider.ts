import type { InspectionOutcome, PaymentMethod } from "@/generated/prisma/client";

// The shopper-facing pharmacy facts as stored on Provider (see prisma/schema.prisma).
export type ProviderFactsData = {
  trustpilotUrl: string | null;
  trustpilotScoreTenths: number | null;
  trustpilotReviewCount: number | null;
  inspectionOutcome: InspectionOutcome | null;
  inspectionDate: Date | null;
  nextDayDelivery: boolean | null;
  discreetPackaging: boolean | null;
  paymentMethods: PaymentMethod[];
};

export type ProviderFactsCheckedAt = {
  trustpilotCheckedAt: Date | null;
  inspectionCheckedAt: Date | null;
  serviceFactsCheckedAt: Date | null;
};
