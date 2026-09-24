"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Availability, PurchaseModel } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { linkOfferToProductMatch, unlinkOfferFromProductMatch } from "@/lib/price-collection/offer-product-match";
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
  fieldErrors?: Partial<Record<keyof z.infer<typeof offerSchema> | "providerId", string[]>>;
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

// "Keep this price updated from the product page" — the offer's source URL becomes a confirmed
// product match that scrapes visit directly (see linkOfferToProductMatch).
function tracksProductPage(formData: FormData) {
  return formData.get("trackProductPage") === "on";
}

function revalidateOfferPages(providerId: string, productVariantId: string) {
  revalidatePath(`/admin/pharmacies/${providerId}`);
  revalidatePath(`/admin/catalogue/product-variants/${productVariantId}/prices`);
}

// providerId comes from the form (hidden when the pharmacy is fixed, a select on a variant's prices page).
export async function createOffer(_prevState: OfferState, formData: FormData): Promise<OfferState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to add offers." };
  }

  const providerId = String(formData.get("providerId") ?? "").trim();
  if (!providerId) return { fieldErrors: { providerId: ["Choose a pharmacy."] } };

  const parsed = parseOfferFormData(formData);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const offer = await prisma.$transaction(async (tx) => {
    const created = await tx.offer.create({ data: { providerId, ...parsed.data } });
    await recordPriceHistorySnapshot(tx, created.id, created.retrievedAt);
    if (tracksProductPage(formData)) {
      await linkOfferToProductMatch(tx, { offerId: created.id, providerId, productVariantId: created.productVariantId, productPageUrl: created.sourceUrl, staffUserId: staffUser.id });
    }
    return created;
  });

  await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "Offer", entityId: offer.id, changes: { providerId, itemPricePence: offer.itemPricePence } });

  revalidateOfferPages(providerId, offer.productVariantId);
  return {};
}

export async function updateOffer(offerId: string, _prevState: OfferState, formData: FormData): Promise<OfferState> {
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
    select: { providerId: true, productVariantId: true, itemPricePence: true, deliveryFeePence: true, consultationFeePence: true, otherMandatoryFeesPence: true, availability: true },
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
    if (tracksProductPage(formData)) {
      await linkOfferToProductMatch(tx, { offerId: updated.id, providerId: updated.providerId, productVariantId: updated.productVariantId, productPageUrl: updated.sourceUrl, staffUserId: staffUser.id });
    } else {
      await unlinkOfferFromProductMatch(tx, updated.id);
    }
    return updated;
  });

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Offer", entityId: offer.id, changes: { itemPricePence: offer.itemPricePence } });

  revalidateOfferPages(existing.providerId, existing.productVariantId);
  if (existing.productVariantId !== offer.productVariantId) revalidateOfferPages(existing.providerId, offer.productVariantId);
  return {};
}

export async function deleteOffer(offerId: string) {
  const staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  const offer = await prisma.offer.delete({ where: { id: offerId }, select: { providerId: true, productVariantId: true } });
  await recordAuditLog({ actorId: staffUser.id, action: "DELETE", entityType: "Offer", entityId: offerId, changes: { providerId: offer.providerId } });
  revalidateOfferPages(offer.providerId, offer.productVariantId);
}
