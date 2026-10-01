import { redirect } from "next/navigation";

import { getPendingWork } from "@/actions/notifications/pending-work";
import { AdminShell } from "@/components/admin/admin-shell";
import { getStaffUser } from "@/lib/staff-auth";

import type { ReactNode } from "react";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const staffUser = await getStaffUser();
  if (!staffUser) redirect("/admin/login");

  return <AdminShell user={staffUser} pendingWork={await getPendingWork()}>{children}</AdminShell>;
}
