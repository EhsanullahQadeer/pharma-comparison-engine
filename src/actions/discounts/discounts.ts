"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { DiscountValueType } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { recordPriceHistorySnapshot } from "@/lib/price-history";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

const discountSchema = z
  .object({
    eligibility: z.string().trim().min(2, "Describe who this discount applies to."),
    // Codes are case-sensitive at some checkouts, so kept exactly as entered (only trimmed).
    code: z.string().trim().max(40, "Keep the code under 40 characters.").optional(),
    valueType: z.enum(DiscountValueType),
    valuePence: z.coerce.number().int().min(0).optional(),
    valuePercent: z.coerce.number().int().min(0).max(100).optional(),
    stackable: z.boolean().optional(),
    expiresAt: z.coerce.date().optional(),
  })
  .refine((data) => (data.valueType === "PERCENT" ? data.valuePercent !== undefined : data.valuePence !== undefined), {
    error: "Enter a value matching the selected discount type.",
    path: ["valueType"],
  });

export type DiscountState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
};

export async function createDiscount(offerId: string, providerId: string, _prevState: DiscountState, formData: FormData): Promise<DiscountState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to add discounts." };
  }

  const parsed = discountSchema.safeParse({
    eligibility: formData.get("eligibility"),
    code: formData.get("code") || undefined,
    valueType: formData.get("valueType"),
    valuePence: formData.get("valuePence") || undefined,
    valuePercent: formData.get("valuePercent") || undefined,
    stackable: formData.get("stackable") === "on",
    expiresAt: formData.get("expiresAt") || undefined,
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const discount = await prisma.$transaction(async (tx) => {
    const created = await tx.discount.create({ data: { offerId, ...parsed.data } });
    await recordPriceHistorySnapshot(tx, offerId, new Date());
    return created;
  });

  await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "Discount", entityId: discount.id, changes: { offerId } });

  revalidatePath(`/admin/pharmacies/${providerId}`);
  return {};
}

export async function deleteDiscount(discountId: string, providerId: string) {
  const staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.discount.delete({ where: { id: discountId } });
    await recordPriceHistorySnapshot(tx, deleted.offerId, new Date());
  });

  await recordAuditLog({ actorId: staffUser.id, action: "DELETE", entityType: "Discount", entityId: discountId, changes: { providerId } });
  revalidatePath(`/admin/pharmacies/${providerId}`);
}
