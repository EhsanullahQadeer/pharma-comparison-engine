import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getStaffUser } from "@/lib/staff-auth";

import type { ReactNode } from "react";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const staffUser = await getStaffUser();
  if (!staffUser) redirect("/admin/login");

  return <AdminShell user={staffUser}>{children}</AdminShell>;
}
