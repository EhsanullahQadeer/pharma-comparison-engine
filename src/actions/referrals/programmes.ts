"use server";

import { revalidatePath } from "next/cache";

import { affiliateProgrammeFormSchema, toProgrammeData } from "@/actions/referrals/programme-schema";
import type { AffiliateProgrammeFormValues } from "@/actions/referrals/programme-schema";
import type { AffiliateProgrammeStatus, StaffRole } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { revalidatePublicSite } from "@/lib/revalidate-public-site";
import { requireStaffRole } from "@/lib/staff-auth";

// Affiliate programmes (referral-earnings-plan Phase 2). Commercial decisions, so only commercial
// managers and administrators can change them; every change is audit-logged. Nothing here is read
// by ranking code — a programme only changes where /go sends a partner's clicks.

export type AffiliateProgrammeActionState = { error?: string };

const WRITE_ROLES: StaffRole[] = ["COMMERCIAL_MANAGER", "ADMINISTRATOR"];
const READ_ROLES: StaffRole[] = ["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"];
const NO_ACCESS = "Only commercial managers and administrators can change affiliate programmes.";

// Why a programme can't be (or stay) ACTIVE: roadmap §2.10 — many pharmacy programmes forbid
// promoting prescription-only medicines, so activation needs that permission on record.
function activationBlocker(programme: { pomPromotionPermitted: boolean; termsUrl: string | null }) {
  if (!programme.pomPromotionPermitted) return "Tick the prescription-medicine permission first: the programme's terms must allow comparing prescription-only ED medicines.";
  if (!programme.termsUrl) return "Add a link to the programme's terms first, as the record of that permission.";
  return null;
}

async function requireWriter() {
  try {
    return await requireStaffRole(WRITE_ROLES);
  } catch {
    return null;
  }
}

function revalidateProgrammePages(providerId: string) {
  revalidatePath(`/admin/pharmacies/${providerId}`);
  revalidatePath("/admin/pharmacies");
  // Activation can make a pharmacy a partner, which changes links and disclosures on public pages.
  revalidatePublicSite();
}

export async function getAffiliateProgramme(providerId: string) {
  await requireStaffRole(READ_ROLES);
  return prisma.affiliateProgramme.findUnique({ where: { providerId } });
}

export async function saveAffiliateProgramme(providerId: string, values: AffiliateProgrammeFormValues): Promise<AffiliateProgrammeActionState> {
  const staffUser = await requireWriter();
  if (!staffUser) return { error: NO_ACCESS };

  const parsed = affiliateProgrammeFormSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const data = toProgrammeData(parsed.data);

  const existing = await prisma.affiliateProgramme.findUnique({ where: { providerId }, select: { id: true, status: true } });
  if (existing?.status === "ACTIVE") {
    const blocker = activationBlocker(data);
    if (blocker) return { error: `This programme is active. ${blocker} Or pause it before removing them.` };
  }

  if (!existing) {
    const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { id: true } });
    if (!provider) return { error: "Pharmacy not found." };
    const created = await prisma.affiliateProgramme.create({ data: { ...data, providerId } });
    await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "AffiliateProgramme", entityId: created.id, changes: { providerId, network: data.network } });
  } else {
    await prisma.affiliateProgramme.update({ where: { id: existing.id }, data });
    await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "AffiliateProgramme", entityId: existing.id, changes: { ...data } });
  }

  revalidateProgrammePages(providerId);
  return {};
}

// Activating also marks the pharmacy as an affiliate partner (so it gets a link), in the same
// transaction. Pausing/ending leaves that tick alone: staff decide separately whether a former
// partner stays linked, and its clicks then use the plain product link.
export async function setAffiliateProgrammeStatus(providerId: string, status: AffiliateProgrammeStatus): Promise<AffiliateProgrammeActionState> {
  const staffUser = await requireWriter();
  if (!staffUser) return { error: NO_ACCESS };

  const programme = await prisma.affiliateProgramme.findUnique({
    where: { providerId },
    select: { id: true, status: true, pomPromotionPermitted: true, termsUrl: true, activatedAt: true, provider: { select: { affiliateApproved: true } } },
  });
  if (!programme) return { error: "Add the programme's details first." };
  if (programme.status === status) return {};

  const activating = status === "ACTIVE";
  if (activating) {
    const blocker = activationBlocker(programme);
    if (blocker) return { error: blocker };
  }
  const linking = activating && !programme.provider.affiliateApproved;

  await prisma.$transaction([
    prisma.affiliateProgramme.update({ where: { id: programme.id }, data: { status, ...(activating ? { activatedAt: new Date() } : {}) } }),
    ...(linking ? [prisma.provider.update({ where: { id: providerId }, data: { affiliateApproved: true } })] : []),
  ]);

  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "AffiliateProgramme", entityId: programme.id, changes: { status: { from: programme.status, to: status } } });
  if (linking) {
    await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "Provider", entityId: providerId, changes: { affiliateApproved: { from: false, to: true }, reason: "affiliate programme activated" } });
  }

  revalidateProgrammePages(providerId);
  return {};
}
