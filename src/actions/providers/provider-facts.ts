"use server";

import { revalidatePath } from "next/cache";

import { providerFactsSchema, type ProviderFactsFormValues } from "@/actions/providers/provider-facts-schema";
import { recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { checkedAtUpdates, factsFromForm } from "@/lib/provider-facts";
import { requireStaffRole } from "@/lib/staff-auth";

export type ProviderFactsState = { error?: string };

// Shopper-facing facts (Trustpilot, GPhC inspection, delivery and payment) shown on the public
// grid and used by its filters, so the same editors who maintain the catalogue record them.
export async function updateProviderFacts(providerId: string, values: ProviderFactsFormValues): Promise<ProviderFactsState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "ADMINISTRATOR"]);
  } catch {
    return { error: "You are not authorized to edit pharmacy facts." };
  }
  const parsed = providerFactsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  const previous = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { trustpilotUrl: true, trustpilotScoreTenths: true, trustpilotReviewCount: true, inspectionOutcome: true, inspectionDate: true, nextDayDelivery: true, discreetPackaging: true, paymentMethods: true },
  });
  if (!previous) return { error: "This pharmacy is no longer on record." };

  const next = factsFromForm(parsed.data);
  const stamps = checkedAtUpdates(previous, next, parsed.data.recheckedToday, new Date());
  await prisma.provider.update({ where: { id: providerId }, data: { ...next, ...stamps } });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Provider", entityId: providerId, changes: { facts: { ...next, inspectionDate: next.inspectionDate?.toISOString() ?? null }, checked: Object.keys(stamps) } });
  revalidatePath(`/admin/pharmacies/${providerId}`);
  revalidatePath("/ed/compare");
  return {};
}
