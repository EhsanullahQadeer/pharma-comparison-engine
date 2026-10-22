import { createHash, randomBytes } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import type { PartnerUserSession } from "@/types/auth";
import type { PartnerAccountStatus } from "@/types/partners";

// Pure rules behind getPartnerUser (src/lib/partner-auth.ts) and the partner login
// (docs/partner-portal-plan.md). Server-only (node:crypto).

// After a partnership ends, its portal users keep read-only access this long (client decision).
export const PARTNER_GRACE_DAYS = 90;
export const INVITE_VALID_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type SessionUser = { kind?: string; id?: string } | null | undefined;

export type PartnerRecord = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  passwordHash: string | null;
  provider: { id: string; tradingName: string; affiliateApproved: boolean; partnershipEndedAt: Date | null };
};

// Everything toPartnerUserSession needs, for the login and every partner request alike.
export const partnerSelect = {
  id: true,
  name: true,
  email: true,
  active: true,
  passwordHash: true,
  provider: { select: { id: true, tradingName: true, affiliateApproved: true, partnershipEndedAt: true } },
} satisfies Prisma.PartnerUserSelect;

export function partnerSessionId(user: SessionUser) {
  return user?.kind === "partner" && user.id ? user.id : null;
}

// When this partner's access stops: never while the pharmacy is a partner; 90 days after the
// partnership ended otherwise. A pharmacy that was never a partner has no access at all.
export function partnerAccessEndsAt(provider: PartnerRecord["provider"]): Date | null | "none" {
  if (provider.affiliateApproved) return null;
  if (!provider.partnershipEndedAt) return "none";
  return new Date(provider.partnershipEndedAt.getTime() + PARTNER_GRACE_DAYS * DAY_MS);
}

// Only an active account that has set its password, at a pharmacy still within its access, counts.
// Identity and pharmacy come from the database record, never from the token.
export function toPartnerUserSession(partner: PartnerRecord | null, now: Date): PartnerUserSession | null {
  if (!partner?.active || !partner.passwordHash) return null;
  const endsAt = partnerAccessEndsAt(partner.provider);
  if (endsAt === "none" || (endsAt && endsAt <= now)) return null;
  return {
    kind: "partner",
    id: partner.id,
    name: partner.name,
    email: partner.email,
    providerId: partner.provider.id,
    providerName: partner.provider.tradingName,
    accessEndsAt: endsAt,
  };
}

// One-time invite: the token only ever travels in the link; the database keeps its SHA-256.
export function newInviteToken(now: Date) {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInviteToken(token), expiresAt: new Date(now.getTime() + INVITE_VALID_DAYS * DAY_MS) };
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

// How staff see an account: switched off, waiting on its invite (or that invite lapsed), or in use.
export function partnerAccountStatus(account: { active: boolean; passwordHash: string | null; inviteExpiresAt: Date | null }, now: Date): PartnerAccountStatus {
  if (!account.active) return "ACCESS_OFF";
  if (account.passwordHash) return "ACTIVE";
  return account.inviteExpiresAt && account.inviteExpiresAt > now ? "INVITED" : "INVITE_EXPIRED";
}
