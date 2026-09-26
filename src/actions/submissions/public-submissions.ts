"use server";

import { revalidatePath } from "next/cache";


import { correctionRequestSchema, contactMessageSchema, pharmacySuggestionSchema } from "@/actions/submissions/submission-schemas";
import type { ContactMessageValues, CorrectionRequestValues, PharmacySuggestionValues } from "@/actions/submissions/submission-schemas";
import type { PublicSubmissionKind, PublicSubmissionStatus } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { providerSlug } from "@/lib/comparison";
import { prisma } from "@/lib/prisma";
import { checkSubmission } from "@/lib/spam-guard";
import { requireStaffRole } from "@/lib/staff-auth";

import type { z } from "zod";

export type PublicFormState = { ok?: boolean; error?: string };

const RATE_LIMITED = "You've sent several messages in a short time. Please try again in a few minutes.";

// Shared tail of every public form: validate, spam-check, then save.
async function accept<T extends { nickname?: string; startedAt: number }>(
  schema: z.ZodType<T>,
  values: unknown,
  save: (data: T) => Promise<unknown>,
): Promise<PublicFormState> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  const verdict = await checkSubmission(parsed.data);
  if (verdict === "rate-limited") return { error: RATE_LIMITED };
  if (verdict === "ok") await save(parsed.data);
  return { ok: true };
}

export async function submitPharmacySuggestion(values: PharmacySuggestionValues): Promise<PublicFormState> {
  return accept(pharmacySuggestionSchema, values, async (data) => {
    await prisma.publicSubmission.create({
      data: { kind: "PHARMACY_SUGGESTION", pharmacyName: data.pharmacyName, websiteUrl: data.websiteUrl, regulatorReference: data.regulatorReference || null, message: data.message || "(no message)", email: data.email || null },
    });
    revalidatePath("/admin/inbox");
  });
}

export async function submitContactMessage(values: ContactMessageValues): Promise<PublicFormState> {
  return accept(contactMessageSchema, values, async (data) => {
    await prisma.publicSubmission.create({ data: { kind: "CONTACT", name: data.name || null, email: data.email, subject: data.topic, message: data.message } });
    revalidatePath("/admin/inbox");
  });
}

// Listing corrections join the existing staff Corrections queue (/admin/reviews), linked to the
// pharmacy when the visitor picked one.
export async function submitCorrectionRequest(values: CorrectionRequestValues): Promise<PublicFormState> {
  return accept(correctionRequestSchema, values, async (data) => {
    const providers = data.pharmacySlug ? await prisma.provider.findMany({ where: { status: "PUBLISHED" }, select: { id: true, websiteDomain: true } }) : [];
    const provider = providers.find((entry) => providerSlug(entry.websiteDomain) === data.pharmacySlug);
    const reportedIssue = data.pageUrl ? `${data.message}\n\nPage: ${data.pageUrl}` : data.message;
    await prisma.correction.create({ data: { reportedIssue, reporterEmail: data.email || null, providerId: provider?.id ?? null } });
    revalidatePath("/admin/reviews");
  });
}

// Staff inbox for suggestions and contact messages.
export async function getPublicSubmissions(kind?: PublicSubmissionKind) {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  return prisma.publicSubmission.findMany({
    where: kind ? { kind } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { handledBy: { select: { name: true } } },
  });
}

export async function setPublicSubmissionStatus(id: string, status: PublicSubmissionStatus): Promise<PublicFormState> {
  let staffUser;
  try {
    staffUser = await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  } catch {
    return { error: "You are not authorized to update messages." };
  }
  await prisma.publicSubmission.update({ where: { id }, data: { status, handledById: status === "NEW" ? null : staffUser.id, handledAt: status === "NEW" ? null : new Date() } });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "PublicSubmission", entityId: id, changes: { status } });
  revalidatePath("/admin/inbox");
  return { ok: true };
}
