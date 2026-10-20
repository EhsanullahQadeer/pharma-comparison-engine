import { z } from "zod";

// Plain module (not "use server"): the intake card validates with this, the action re-validates.
export const websiteIntakeSchema = z.object({
  website: z.string().trim().min(4, "Paste the pharmacy's website address.").max(500),
});

export type WebsiteIntakeValues = z.infer<typeof websiteIntakeSchema>;
