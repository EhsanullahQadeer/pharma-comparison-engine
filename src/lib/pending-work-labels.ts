import { AlertTriangle, Eye, FileText, Flag, Inbox, PackageSearch, Radar, ShieldCheck, Truck } from "lucide-react";

import type { PendingWorkItem, PendingWorkKind } from "@/types/pending-work";

import type { LucideIcon } from "lucide-react";

export const pendingWorkLabels: Record<PendingWorkKind, string> = {
  candidates: "Pharmacy candidates to review",
  productMatches: "Product matches to confirm",
  evidence: "Evidence to approve",
  corrections: "Corrections to resolve",
  inbox: "New inbox messages",
  articles: "Draft articles to publish",
  siteOffers: "Delivery charges and discounts to approve",
  priceChecks: "Price checks that need attention",
  draftPrices: "Draft prices to publish",
};

export const pendingWorkIcons: Record<PendingWorkKind, LucideIcon> = {
  candidates: Radar,
  productMatches: PackageSearch,
  evidence: ShieldCheck,
  corrections: Flag,
  inbox: Inbox,
  articles: FileText,
  siteOffers: Truck,
  priceChecks: AlertTriangle,
  draftPrices: Eye,
};

export function pendingWorkTotal(items: PendingWorkItem[]) {
  return items.reduce((sum, item) => sum + item.count, 0);
}
