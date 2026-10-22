// Pharmacy portal accounts as staff see them on the pharmacy's admin page (docs/partner-portal-plan.md).
export type PartnerAccountStatus = "INVITED" | "INVITE_EXPIRED" | "ACTIVE" | "ACCESS_OFF";

export type ProviderPartnerUser = {
  id: string;
  name: string;
  email: string;
  status: PartnerAccountStatus;
  invitedAt: Date;
  inviteExpiresAt: Date | null;
  lastLoginAt: Date | null;
};

// After an invite is created or re-sent: emailed, or (no email set up) a link for staff to send.
export type PartnerInviteResult = { error?: string; emailed?: boolean; inviteUrl?: string };

export type PartnerInvite = { name: string; email: string; providerName: string };

export type PartnerHome = { clicksLast30Days: number; publishedPrices: number };
