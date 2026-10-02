import { BarChart3, ClipboardList, FileText, History, Inbox, LayoutDashboard, MousePointerClick, Pill, Radar, ShieldCheck, Users } from "lucide-react";

import type { LucideIcon } from "lucide-react";

export type AdminNavItem = { href: string; label: string; icon: LucideIcon };
export type AdminNavSection = { label: string; items: AdminNavItem[] };

export const adminNavSections: AdminNavSection[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Directory", items: [{ href: "/admin/pharmacies", label: "Pharmacies", icon: Pill }] },
  { label: "Catalogue", items: [{ href: "/admin/catalogue/product-variants", label: "Product variants", icon: ClipboardList }] },
  {
    label: "Reviews",
    items: [
      { href: "/admin/reviews", label: "Evidence & corrections", icon: ShieldCheck },
      { href: "/admin/inbox", label: "Inbox", icon: Inbox },
    ],
  },
  { label: "Content", items: [{ href: "/admin/articles", label: "Articles", icon: FileText }] },
  {
    label: "Reports",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/analytics/clicks", label: "Clicks to pharmacies", icon: MousePointerClick },
      { href: "/admin/audit-log", label: "Audit log", icon: History },
    ],
  },
  { label: "Discovery", items: [{ href: "/admin/discovery-sources", label: "Discovery sources", icon: Radar }] },
  { label: "Staff", items: [{ href: "/admin/staff", label: "Staff users", icon: Users }] },
];
