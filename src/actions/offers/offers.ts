"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Availability, PurchaseModel } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { recordPriceHistorySnapshot } from "@/lib/price-history";
import { prisma } from "@/lib/prisma";
import { requireStaffRole } from "@/lib/staff-auth";

const offerSchema = z.object({
  productVariantId: z.string().trim().min(1, "Choose a product variant."),
  itemPricePence: z.coerce.number().int("Whole pence only.").min(0, "Cannot be negative."),
  deliveryFeePence: z.coerce.number().int("Whole pence only.").min(0, "Cannot be negative."),
  consultationFeePence: z.coerce.number().int("Whole pence only.").min(0, "Cannot be negative."),
  otherMandatoryFeesPence: z.coerce.number().int("Whole pence only.").min(0, "Cannot be negative."),
  deliveryAssumption: z.string().trim().min(2, "Describe the delivery assumption used for the total (e.g. \"1 pack, standard delivery\")."),
  availability: z.enum(Availability),
  purchaseModel: z.enum(PurchaseModel),
  billingPeriodDays: z.coerce.number().int().min(1).optional(),
  sourceUrl: z.string().trim().url("Enter a valid source URL."),
  retrievedAt: z.coerce.date({ error: "Enter the date this price was retrieved." }),
});

export type OfferState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof offerSchema>, string[]>>;
};

function parseOfferFormData(formData: FormData) {
  return offerSchema.safeParse({
    productVariantId: formData.get("productVariantId"),
    itemPricePence: formData.get("itemPricePence"),
    deliveryFeePence: formData.get("deliveryFeePence") || 0,
    consultationFeePence: formData.get("consultationFeePence") || 0,
    otherMandatoryFeesPence: formData.get("otherMandatoryFeesPence") || 0,
    deliveryAssumption: formData.get("deliveryAssumption"),
    availability: formData.get("availability"),
    purchaseModel: formData.get("purchaseModel"),
    billingPeriodDays: formData.get("billingPeriodDays") || undefined,
    sourceUrl: formData.get("sourceUrl"),
    retrievedAt: formData.get("retrievedAt"),
  });
}

export async function createOffer(providerId: string, _prevState: OfferState, formData: FormData): Promise<OfferState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to add offers." };
  }

  const parsed = parseOfferFormData(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const offer = await prisma.$transaction(async (tx) => {
    const created = await tx.offer.create({ data: { providerId, ...parsed.data } });
    await recordPriceHistorySnapshot(tx, created.id, created.retrievedAt);
    return created;
  });

  await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "Offer", entityId: offer.id, changes: { providerId, itemPricePence: offer.itemPricePence } });

  revalidatePath(`/admin/pharmacies/${providerId}`);
  return {};
}

export async function updateOffer(offerId: string, providerId: string, _prevState: OfferState, formData: FormData): Promise<OfferState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to edit offers." };
  }

  const parsed = parseOfferFormData(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const existing = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { itemPricePence: true, deliveryFeePence: true, consultationFeePence: true, otherMandatoryFeesPence: true, availability: true },
  });
  if (!existing) return { error: "Offer not found." };

  const stateChanged =
    existing.itemPricePence !== parsed.data.itemPricePence ||
    existing.deliveryFeePence !== parsed.data.deliveryFeePence ||
    existing.consultationFeePence !== parsed.data.consultationFeePence ||
    existing.otherMandatoryFeesPence !== parsed.data.otherMandatoryFeesPence ||
    existing.availability !== parsed.data.availability;

  const offer = await prisma.$transaction(async (tx) => {
    const updated = await tx.offer.update({ where: { id: offerId }, data: parsed.data });
    if (stateChanged) {
      await recordPriceHistorySnapshot(tx, updated.id, updated.retrievedAt);
    }
    return updated;
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Offer", entityId: offer.id, changes: { itemPricePence: offer.itemPricePence } });

  revalidatePath(`/admin/pharmacies/${providerId}`);
  return {};
}

export async function deleteOffer(offerId: string, providerId: string) {
  const staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  await prisma.offer.delete({ where: { id: offerId } });
  await recordAuditLog({ actorId: staffUser.id, action: "DELETE", entityType: "Offer", entityId: offerId, changes: { providerId } });
  revalidatePath(`/admin/pharmacies/${providerId}`);
}
