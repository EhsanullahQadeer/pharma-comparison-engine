"use client";

import type { getStaffUsers } from "@/actions/staff/staff";
import { EditStaffModal } from "@/components/admin/staff-form-modal";
import { Badge } from "@/components/common/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import { TableViewPagination } from "@/components/common/table-view-pagination";
import { useTableView } from "@/hooks/useTableView";
import { staffRoleLabels } from "@/lib/staff-role-labels";
import type { TableSorters } from "@/types/table";

type StaffRow = Awaited<ReturnType<typeof getStaffUsers>>[number];

const sorters = {
  name: (staffUser) => staffUser.name,
  email: (staffUser) => staffUser.email,
  role: (staffUser) => staffRoleLabels[staffUser.role],
  status: (staffUser) => staffUser.active,
  lastLogin: (staffUser) => staffUser.lastLoginAt,
} satisfies TableSorters<StaffRow>;

export function StaffTable({ staffUsers }: { staffUsers: StaffRow[] }) {
  const view = useTableView(staffUsers, sorters);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead {...view.sortProps("name")}>Name</TableHead>
            <TableHead {...view.sortProps("email")}>Email</TableHead>
            <TableHead {...view.sortProps("role")}>Role</TableHead>
            <TableHead {...view.sortProps("status")}>Status</TableHead>
            <TableHead {...view.sortProps("lastLogin")}>Last login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.map((staffUser) => (
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
      <TableViewPagination pagination={view.pagination} className="px-(--card-spacing)" />
    </>
  );
}
