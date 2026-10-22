"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { partnerInviteSchema, type PartnerInviteValues } from "@/actions/partners/partner-schemas";
import type { StaffRole } from "@/generated/prisma/client";
import { recordAuditLog } from "@/lib/audit-log";
import { mailerConfigured, sendEmail } from "@/lib/mailer";
import { partnerInviteEmail } from "@/lib/partner-emails";
import { newInviteToken, partnerAccountStatus } from "@/lib/partner-session";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site-url";
import { requireStaffRole } from "@/lib/staff-auth";
import type { PartnerInviteResult, ProviderPartnerUser } from "@/types/partners";

// Staff side of the pharmacy portal (docs/partner-portal-plan.md, step B): who at a pharmacy has
// portal access, and inviting / re-inviting / switching it off. A commercial decision, so the same
// roles that manage partner status. Accounts are never deleted here (a former partner may want its
// past figures); "Portal access" switches them off.

const MANAGERS: StaffRole[] = ["COMMERCIAL_MANAGER", "ADMINISTRATOR"];
const NO_ACCESS = "Only commercial managers and administrators can manage portal access.";

async function requireManager() {
  try {
    return await requireStaffRole(MANAGERS);
  } catch {
    return null;
  }
}

export async function getProviderPartnerUsers(providerId: string): Promise<ProviderPartnerUser[]> {
  await requireStaffRole(["CATALOGUE_EDITOR", "CONTENT_REVIEWER", "ADMINISTRATOR", "COMMERCIAL_MANAGER"]);
  const accounts = await prisma.partnerUser.findMany({
    where: { providerId },
    select: { id: true, name: true, email: true, active: true, passwordHash: true, invitedAt: true, inviteExpiresAt: true, lastLoginAt: true },
    orderBy: { invitedAt: "asc" },
  });
  const now = new Date();
  // The password hash only decides the status; it never leaves the server.
  return accounts.map(({ passwordHash, active, ...account }) => ({ ...account, status: partnerAccountStatus({ active, passwordHash, inviteExpiresAt: account.inviteExpiresAt }, now) }));
}

// The link points at this deployment: NEXT_PUBLIC_SITE_URL when set, else the address staff are on.
async function inviteUrl(token: string) {
  const requestHeaders = await headers();
  const origin = siteUrl ?? `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${requestHeaders.get("host")}`;
  return new URL(`/partner/invite/${token}`, origin).href;
}

// Emails the link when email is set up; otherwise hands it to the staff member to send.
async function deliverInvite(account: { name: string; email: string; providerName: string }, token: string): Promise<PartnerInviteResult> {
  const url = await inviteUrl(token);
  if (!mailerConfigured() || !siteUrl) return { inviteUrl: url, emailed: false };
  try {
    await sendEmail({ to: account.email, ...partnerInviteEmail({ name: account.name, providerName: account.providerName, inviteUrl: url }) });
    return { emailed: true };
  } catch {
    return { inviteUrl: url, emailed: false, error: "The invite email couldn't be sent. Copy the link below and send it yourself." };
  }
}

export async function invitePartnerUser(providerId: string, values: PartnerInviteValues): Promise<PartnerInviteResult> {
  const staffUser = await requireManager();
  if (!staffUser) return { error: NO_ACCESS };
  const parsed = partnerInviteSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the name and email." };
  const { name, email } = parsed.data;

  const provider = await prisma.provider.findUnique({ where: { id: providerId }, select: { tradingName: true, affiliateApproved: true } });
  if (!provider) return { error: "Pharmacy not found." };
  if (!provider.affiliateApproved) return { error: "Only affiliate partners have a portal. Tick “Affiliate partner” first." };
  // One email, one account: a staff email would never reach the partner login, and an existing
  // portal email belongs to a pharmacy already (possibly another one).
  const [staffAccount, partnerAccount] = await Promise.all([
    prisma.staffUser.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } }),
    prisma.partnerUser.findUnique({ where: { email }, select: { providerId: true } }),
  ]);
  if (staffAccount) return { error: "That email belongs to a staff account. Use the pharmacy person's own address." };
  if (partnerAccount) return { error: partnerAccount.providerId === providerId ? "They already have an account here. Use “Resend invite” instead." : "That email already has portal access for another pharmacy." };

  const invite = newInviteToken(new Date());
  const created = await prisma.partnerUser.create({
    data: { providerId, name, email, inviteTokenHash: invite.tokenHash, inviteExpiresAt: invite.expiresAt, invitedById: staffUser.id },
    select: { id: true },
  });
  const delivery = await deliverInvite({ name, email, providerName: provider.tradingName }, invite.token);
  await recordAuditLog({ actorId: staffUser.id, action: "CREATE", entityType: "PartnerUser", entityId: created.id, changes: { providerId, email, invite: delivery.emailed ? "emailed" : "link given to staff" } });
  revalidatePath(`/admin/pharmacies/${providerId}`);
  return delivery;
}

// A fresh link (the old one stops working), for an account that hasn't set its password yet.
export async function resendPartnerInvite(partnerUserId: string): Promise<PartnerInviteResult> {
  const staffUser = await requireManager();
  if (!staffUser) return { error: NO_ACCESS };
  const account = await prisma.partnerUser.findUnique({ where: { id: partnerUserId }, select: { name: true, email: true, active: true, passwordHash: true, providerId: true, provider: { select: { tradingName: true } } } });
  if (!account) return { error: "This account no longer exists." };
  if (!account.active) return { error: "Turn portal access back on first." };
  if (account.passwordHash) return { error: "They've already set a password and can sign in at /partner/login." };

  const invite = newInviteToken(new Date());
  await prisma.partnerUser.update({ where: { id: partnerUserId }, data: { inviteTokenHash: invite.tokenHash, inviteExpiresAt: invite.expiresAt, invitedAt: new Date(), invitedById: staffUser.id } });
  const delivery = await deliverInvite({ name: account.name, email: account.email, providerName: account.provider.tradingName }, invite.token);
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "PartnerUser", entityId: partnerUserId, changes: { event: "invite re-sent", invite: delivery.emailed ? "emailed" : "link given to staff" } });
  revalidatePath(`/admin/pharmacies/${account.providerId}`);
  return delivery;
}

// "Portal access" switch. Switching off also cancels an unused invite.
export async function setPartnerUserActive(partnerUserId: string, active: boolean): Promise<{ error?: string }> {
  const staffUser = await requireManager();
  if (!staffUser) return { error: NO_ACCESS };
  const account = await prisma.partnerUser.findUnique({ where: { id: partnerUserId }, select: { active: true, providerId: true } });
  if (!account) return { error: "This account no longer exists." };
  if (account.active === active) return {};
  await prisma.partnerUser.update({ where: { id: partnerUserId }, data: { active, ...(active ? {} : { inviteTokenHash: null, inviteExpiresAt: null }) } });
  await recordAuditLog({ actorId: staffUser.id, action: "UPDATE", entityType: "PartnerUser", entityId: partnerUserId, changes: { active: { from: account.active, to: active } } });
  revalidatePath(`/admin/pharmacies/${account.providerId}`);
  return {};
}
