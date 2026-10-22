import type { PartnerAccountStatus } from "@/types/partners";

export const partnerAccountStatusLabels: Record<PartnerAccountStatus, string> = {
  INVITED: "Invite sent",
  INVITE_EXPIRED: "Invite expired",
  ACTIVE: "Active",
  ACCESS_OFF: "Portal access off",
};

export const partnerAccountStatusBadgeVariant: Record<PartnerAccountStatus, "default" | "secondary" | "outline" | "destructive"> = {
  INVITED: "secondary",
  INVITE_EXPIRED: "outline",
  ACTIVE: "default",
  ACCESS_OFF: "destructive",
};
