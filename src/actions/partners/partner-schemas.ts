import { z } from "zod";

// Plain module (not "use server"): the forms validate client-side with these, and the actions
// re-validate with the same schemas.

export const partnerInviteSchema = z.object({
  name: z.string().trim().min(1, "Enter their name.").max(120),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
});

export type PartnerInviteValues = z.infer<typeof partnerInviteSchema>;

export const partnerPasswordSchema = z
  .object({
    password: z.string().min(12, "Use at least 12 characters.").max(200),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, { message: "The two passwords don't match.", path: ["confirm"] });

export type PartnerPasswordValues = z.infer<typeof partnerPasswordSchema>;
