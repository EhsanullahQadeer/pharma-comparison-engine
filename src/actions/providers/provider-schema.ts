import { z } from "zod";

import { RegulatorType } from "@/generated/prisma/client";

// Plain module, not "use server" — a "use server" file may only export async functions, and this
// schema is shared by two separate "use server" files (providers.ts, discovery-candidates.ts).
export const createProviderSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the registered legal name."),
  tradingName: z.string().trim().min(2, "Enter the trading name."),
  websiteDomain: z
    .string()
    .trim()
    .min(3, "Enter the website domain.")
    .transform((value) => value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")),
  regulatorType: z.enum(RegulatorType),
  regulatorReference: z.string().trim().min(3, "Enter the regulator registration reference."),
  dispensingPartnerName: z.string().trim().optional(),
  serviceRegions: z.string().trim().min(1, "List at least one service region."),
});
