import { getStaffUsers } from "@/actions/staff/staff";
import { AddStaffModal, EditStaffModal } from "@/components/admin/staff-form-modal";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import { staffRoleLabels } from "@/lib/staff-role-labels";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Staff users", robots: { index: false, follow: false } };

export default async function StaffPage() {
  const staffUsers = await getStaffUsers();

  return (
    <div className="space-y-6">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffUsers.map((staffUser) => (
                <TableRow key={staffUser.id}>
                  <TableCell className="font-medium">{staffUser.name}</TableCell>
                  <TableCell className="text-muted-foreground">{staffUser.email}</TableCell>
                  <TableCell>{staffRoleLabels[staffUser.role]}</TableCell>
                  <TableCell>
                    <Badge variant={staffUser.active ? "default" : "secondary"}>{staffUser.active ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {staffUser.lastLoginAt ? new Date(staffUser.lastLoginAt).toLocaleDateString("en-GB") : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <EditStaffModal staffUser={staffUser} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
