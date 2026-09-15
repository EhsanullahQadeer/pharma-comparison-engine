import { BarChart3, ClipboardList, History, LayoutDashboard, Pill, ShieldCheck, Users } from "lucide-react";

import type { LucideIcon } from "lucide-react";

export type AdminNavItem = { href: string; label: string; icon: LucideIcon };
export type AdminNavSection = { label: string; items: AdminNavItem[] };

export const adminNavSections: AdminNavSection[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Directory", items: [{ href: "/admin/pharmacies", label: "Pharmacies", icon: Pill }] },
  { label: "Catalogue", items: [{ href: "/admin/catalogue/product-variants", label: "Product variants", icon: ClipboardList }] },
  { label: "Reviews", items: [{ href: "/admin/reviews", label: "Evidence & corrections", icon: ShieldCheck }] },
  {
    label: "Reports",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/audit-log", label: "Audit log", icon: History },
    ],
  },
  { label: "Staff", items: [{ href: "/admin/staff", label: "Staff users", icon: Users }] },
];
