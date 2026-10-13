import type { AffiliateNetwork, AffiliateProgrammeStatus, ClickDevice, CommissionBasis, ReferralPlacement } from "@/generated/prisma/client";

export const referralPlacementLabels: Record<ReferralPlacement, string> = {
  COMPARE: "Compare",
  INGREDIENT_PRICES: "Medicine prices",
  PHARMACY_PROFILE: "Pharmacy profile",
  REPEAT_COSTS: "Repeat costs",
};

export const clickDeviceLabels: Record<ClickDevice, string> = {
  DESKTOP: "Computer",
  MOBILE: "Phone",
  TABLET: "Tablet",
};

// The UK's nations, as the region code stored with a click; other regions show their code.
export const ukRegionLabels: Record<string, string> = {
  ENG: "England",
  SCT: "Scotland",
  WLS: "Wales",
  NIR: "Northern Ireland",
};

// Shown where a click has no value for a breakdown (older clicks, or the browser didn't say).
export const CLICK_DETAIL_NOT_RECORDED = "Not recorded";

export const affiliateNetworkLabels: Record<AffiliateNetwork, string> = {
  AWIN: "Awin",
  CJ: "CJ Affiliate",
  IMPACT: "Impact",
  DIRECT: "Direct agreement",
  OTHER: "Other network",
};
export const affiliateNetworkValues = Object.keys(affiliateNetworkLabels) as [AffiliateNetwork, ...AffiliateNetwork[]];

export const affiliateProgrammeStatusLabels: Record<AffiliateProgrammeStatus, string> = {
  APPLIED: "Applied",
  ACTIVE: "Active",
  PAUSED: "Paused",
  REJECTED: "Rejected",
  ENDED: "Ended",
};

export const affiliateProgrammeStatusBadgeVariant: Record<AffiliateProgrammeStatus, "secondary" | "default" | "outline" | "destructive"> = {
  APPLIED: "outline",
  ACTIVE: "default",
  PAUSED: "secondary",
  REJECTED: "destructive",
  ENDED: "secondary",
};

// What each status means for the public site, shown next to the status control.
export const affiliateProgrammeStatusHints: Record<AffiliateProgrammeStatus, string> = {
  APPLIED: "Waiting on the network or pharmacy. Clicks use the plain product link.",
  ACTIVE: "Clicks go through the tracked link above, as long as the pharmacy stays ticked as an affiliate partner.",
  PAUSED: "Temporarily off. Clicks use the plain product link.",
  REJECTED: "Not accepted. Clicks use the plain product link.",
  ENDED: "Agreement over. Clicks use the plain product link.",
};

export const commissionBasisLabels: Record<CommissionBasis, string> = {
  FIXED: "Fixed amount per sale (£)",
  PERCENT: "Percentage of sale (%)",
};
export const commissionBasisValues = Object.keys(commissionBasisLabels) as [CommissionBasis, ...CommissionBasis[]];

// commissionValue is stored in hundredths either way: pence for FIXED, basis points for PERCENT.
const commissionFormat: Record<CommissionBasis, (value: number) => string> = {
  FIXED: (value) => `£${(value / 100).toFixed(2)} per sale`,
  PERCENT: (value) => `${(value / 100).toFixed(2).replace(/\.?0+$/, "")}% of sale`,
};

export function formatCommission(basis: CommissionBasis, value: number) {
  return commissionFormat[basis](value);
}
