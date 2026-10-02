import { getStaffUsers } from "@/actions/staff/staff";
import { AddStaffModal } from "@/components/admin/staff-form-modal";
import { StaffTable } from "@/components/admin/staff-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Staff users", robots: { index: false, follow: false } };

export default async function StaffPage() {
  const staffUsers = await getStaffUsers();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Staff users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Administrator-only. Manage who can sign in and what they can do.</p>
        </div>
        <AddStaffModal />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">{staffUsers.length} staff account{staffUsers.length === 1 ? "" : "s"}</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <StaffTable staffUsers={staffUsers} />
        </CardContent>
      </Card>
    </div>
  );
}
