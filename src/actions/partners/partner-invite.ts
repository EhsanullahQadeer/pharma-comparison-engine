"use server";

import bcrypt from "bcryptjs";

import { partnerPasswordSchema, type PartnerPasswordValues } from "@/actions/partners/partner-schemas";
import { recordAuditLog } from "@/lib/audit-log";
import { hashInviteToken, INVITE_TOKEN_PATTERN } from "@/lib/partner-session";
import { prisma } from "@/lib/prisma";
import type { PartnerInvite } from "@/types/partners";

// The invite link's page: acts only through the invite's own secret token, which works once and for
// 7 days, and only for an account staff haven't switched off.

async function findInvite(token: string) {
  if (!INVITE_TOKEN_PATTERN.test(token)) return null;
  const account = await prisma.partnerUser.findUnique({
    where: { inviteTokenHash: hashInviteToken(token) },
    select: { id: true, name: true, email: true, active: true, passwordHash: true, inviteExpiresAt: true, provider: { select: { tradingName: true } } },
  });
  if (!account?.active || account.passwordHash || !account.inviteExpiresAt || account.inviteExpiresAt <= new Date()) return null;
  return account;
}

export async function getPartnerInvite(token: string): Promise<PartnerInvite | null> {
  const account = await findInvite(token);
  return account ? { name: account.name, email: account.email, providerName: account.provider.tradingName } : null;
}

export async function acceptPartnerInvite(token: string, values: PartnerPasswordValues): Promise<{ ok?: true; error?: string }> {
  const parsed = partnerPasswordSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your password." };
  const account = await findInvite(token);
  if (!account) return { error: "This invite link has expired or was already used. Ask us for a new one." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  // Conditional on the token still being this one, so a link used twice at once only counts once.
  const { count } = await prisma.partnerUser.updateMany({
    where: { id: account.id, inviteTokenHash: hashInviteToken(token), passwordHash: null },
    data: { passwordHash, inviteTokenHash: null, inviteExpiresAt: null },
  });
  if (count === 0) return { error: "This invite link has expired or was already used. Ask us for a new one." };
  await recordAuditLog({ actorId: null, action: "UPDATE", entityType: "PartnerUser", entityId: account.id, changes: { event: "invite accepted, password set" } });
  return { ok: true };
}
