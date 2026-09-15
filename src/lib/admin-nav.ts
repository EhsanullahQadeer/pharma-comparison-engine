import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Pill } from "lucide-react";

export type AdminNavItem = { href: string; label: string; icon: LucideIcon };
export type AdminNavSection = { label: string; items: AdminNavItem[] };

export const adminNavSections: AdminNavSection[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "Directory", items: [{ href: "/admin/pharmacies", label: "Pharmacies", icon: Pill }] },
];
