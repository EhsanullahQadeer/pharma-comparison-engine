import { z } from "zod";

import { antiSpam } from "@/actions/submissions/submission-schemas";

// Plain module (not "use server"): the sign-up form validates client-side with this, and the
// action re-validates with the same schema. `target` is "<strength>x<pack>", e.g. "50x8".
export const priceAlertSchema = z.object({
  ...antiSpam,
  productSlug: z.string().regex(/^[a-z0-9-]+$/),
  target: z.string().regex(/^\d{1,4}x\d{1,3}$/, "Choose a strength and pack."),
  threshold: z
    .string()
    .trim()
    .regex(/^£?\d{1,4}(\.\d{1,2})?$/, "Enter a price such as 12.50.")
    .refine((value) => Number(value.replace("£", "")) >= 1, "Enter a price of at least £1."),
  email: z.email("Enter a valid email address."),
});

export type PriceAlertValues = z.infer<typeof priceAlertSchema>;
