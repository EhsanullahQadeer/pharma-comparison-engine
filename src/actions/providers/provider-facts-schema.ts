import { z } from "zod";

// Plain module (not "use server"): the admin card validates with this and the action re-validates
// with it. Values stay strings as the form holds them; src/lib/provider-facts.ts converts them.
const optional = <T extends z.ZodType<string>>(schema: T) => z.union([z.literal(""), schema]);
const triState = z.enum(["unknown", "yes", "no"]);

export const providerFactsSchema = z.object({
  trustpilotUrl: optional(z.url("Enter the pharmacy's Trustpilot page address.").refine((value) => /^https:\/\/([a-z]+\.)?trustpilot\.com\//.test(value), "Use the pharmacy's page on trustpilot.com.")),
  trustpilotScore: optional(z.string().regex(/^(?:[0-4](?:\.\d)?|5(?:\.0)?)$/, "A score from 0.0 to 5.0, e.g. 4.8.")),
  trustpilotReviewCount: optional(z.string().regex(/^\d{1,7}$/, "A whole number of reviews.")),
  inspectionOutcome: z.enum(["", "STANDARDS_MET", "STANDARDS_NOT_ALL_MET", "EXCELLENT", "GOOD", "SATISFACTORY", "POOR"]),
  inspectionDate: optional(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format 2025-03-31.")),
  nextDayDelivery: triState,
  discreetPackaging: triState,
  paymentMethods: z.array(z.enum(["CARD", "APPLE_PAY", "GOOGLE_PAY", "PAYPAL", "KLARNA"])),
  // Re-confirmed unchanged facts still count as checked today.
  recheckedToday: z.boolean(),
});

export type ProviderFactsFormValues = z.infer<typeof providerFactsSchema>;
