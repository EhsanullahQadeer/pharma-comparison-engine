import { z } from "zod";

// Plain module (not "use server"): the public forms validate client-side with these, and the
// actions re-validate with the same schemas. `nickname` is a hidden honeypot; `startedAt` is when
// the form was rendered, both checked by src/lib/spam-guard.ts.
export const antiSpam = {
  nickname: z.string().optional(),
  startedAt: z.number(),
};

const optionalEmail = z.union([z.literal(""), z.email("Enter a valid email address, or leave it blank.")]).optional();

export const pharmacySuggestionSchema = z.object({
  ...antiSpam,
  pharmacyName: z.string().trim().min(2, "Enter the pharmacy's name."),
  websiteUrl: z.url("Enter the pharmacy's website address, starting with https://"),
  regulatorReference: z.string().trim().max(20).optional(),
  message: z.string().trim().max(2000).optional(),
  email: optionalEmail,
});

export const correctionRequestSchema = z.object({
  ...antiSpam,
  pharmacySlug: z.string().optional(),
  pageUrl: z.string().trim().max(500).optional(),
  message: z.string().trim().min(10, "Tell us what's wrong in a sentence or two.").max(2000),
  email: optionalEmail,
});

export const contactTopics = ["general", "listing", "pharmacy", "press"] as const;

export const contactMessageSchema = z.object({
  ...antiSpam,
  name: z.string().trim().max(100).optional(),
  email: z.email("Enter an email address so we can reply."),
  topic: z.enum(contactTopics, { error: "Choose what your message is about." }),
  message: z.string().trim().min(10, "Your message needs a little more detail.").max(4000),
});

export type PharmacySuggestionValues = z.infer<typeof pharmacySuggestionSchema>;
export type CorrectionRequestValues = z.infer<typeof correctionRequestSchema>;
export type ContactMessageValues = z.infer<typeof contactMessageSchema>;
