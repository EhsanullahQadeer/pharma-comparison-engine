import type { DiscoverySourceType } from "@/generated/prisma/client";
import { companiesHouseAdapter } from "@/lib/discovery/adapters/companies-house";
import { cqcAdapter } from "@/lib/discovery/adapters/cqc";
import { gphcAdapter } from "@/lib/discovery/adapters/gphc";
import { nhsOdsAdapter } from "@/lib/discovery/adapters/nhs-ods";
import { nhsbsaContractorDetailsAdapter } from "@/lib/discovery/adapters/nhsbsa-contractor-details";
import type { DiscoveryAdapter } from "@/types/discovery";

const adapters: Record<DiscoverySourceType, DiscoveryAdapter> = {
  MANUAL_WEB: { type: "MANUAL_WEB", async run() { throw new Error("Use the website intake form to submit or retry a website."); } },
  COMPANIES_HOUSE: companiesHouseAdapter,
  CQC: cqcAdapter,
  NHS_ODS: nhsOdsAdapter,
  GPHC: gphcAdapter,
  NHSBSA_CONTRACTOR_DETAILS: nhsbsaContractorDetailsAdapter,
};

export function getAdapter(type: DiscoverySourceType): DiscoveryAdapter {
  return adapters[type];
}
