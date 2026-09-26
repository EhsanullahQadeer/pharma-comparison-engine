import { z } from "zod";

import type { AffiliateProgramme } from "@/generated/prisma/client";
import { linkTemplateError } from "@/lib/affiliate-links";
import { affiliateNetworkValues, commissionBasisValues } from "@/lib/referral-labels";

// Plain module (not "use server") so the admin form validates with the exact rules the server
// re-applies. Numbers are edited as text; commission is entered as pounds or percent and stored in
// hundredths (pence / basis points).
export const affiliateProgrammeFormSchema = z
  .object({
    network: z.enum(affiliateNetworkValues, { error: "Choose the network." }),
    networkMerchantId: z.string().trim().max(100, "Keep the merchant ID under 100 characters."),
    linkTemplate: z
      .string()
      .trim()
      .min(1, "Paste the tracked link template.")
      .superRefine((value, ctx) => {
        const error = linkTemplateError(value);
        if (error) ctx.addIssue({ code: "custom", message: error });
      }),
    commissionBasis: z.enum(commissionBasisValues, { error: "Choose how commission is paid." }),
    commissionAmount: z.string().trim().regex(/^\d{1,4}(\.\d{1,2})?$/, "Enter an amount like 8 or 7.50."),
    attributionDays: z.string().trim().regex(/^(\d{1,3})?$/, "Whole days, or leave blank."),
    termsUrl: z.string().trim().refine((value) => value === "" || /^https:\/\/\S+$/.test(value), "Link to the programme terms (https://…), or leave blank."),
    termsNotes: z.string().trim().max(2000, "Keep notes under 2,000 characters."),
    pomPromotionPermitted: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.commissionBasis === "PERCENT" && Number(values.commissionAmount) > 100) {
      ctx.addIssue({ code: "custom", path: ["commissionAmount"], message: "A percentage can't be more than 100." });
    }
  });

export type AffiliateProgrammeFormValues = z.infer<typeof affiliateProgrammeFormSchema>;

export function toProgrammeData(values: AffiliateProgrammeFormValues) {
  return {
    network: values.network,
    networkMerchantId: values.networkMerchantId || null,
    linkTemplate: values.linkTemplate,
    commissionBasis: values.commissionBasis,
    commissionValue: Math.round(Number(values.commissionAmount) * 100),
    attributionDays: values.attributionDays ? Number(values.attributionDays) : null,
    termsUrl: values.termsUrl || null,
    termsNotes: values.termsNotes || null,
    pomPromotionPermitted: values.pomPromotionPermitted,
  };
}

export function toProgrammeFormValues(programme: AffiliateProgramme | null): AffiliateProgrammeFormValues {
  return {
    network: programme?.network ?? "AWIN",
    networkMerchantId: programme?.networkMerchantId ?? "",
    linkTemplate: programme?.linkTemplate ?? "",
    commissionBasis: programme?.commissionBasis ?? "PERCENT",
    commissionAmount: programme ? (programme.commissionValue / 100).toString() : "",
    attributionDays: programme?.attributionDays?.toString() ?? "",
    termsUrl: programme?.termsUrl ?? "",
    termsNotes: programme?.termsNotes ?? "",
    pomPromotionPermitted: programme?.pomPromotionPermitted ?? false,
  };
}
