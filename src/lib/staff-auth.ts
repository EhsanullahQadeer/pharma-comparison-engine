import { cache } from "react";

import { auth } from "@/auth";
import type { StaffRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { staffSessionId, toStaffUserSession } from "@/lib/staff-session";
import type { StaffUserSession } from "@/types/auth";

export class UnauthorizedError extends Error {}

// The one authoritative "is this a staff member?" check for the admin area, every staff server
// action and the staff API routes. A signed-in session alone isn't enough: it must be a staff
// session (partner-portal accounts will share the same login), and the StaffUser must still
// exist and be active. Role comes from the database, not the token, so changes apply at once.
export const getStaffUser = cache(async (): Promise<StaffUserSession | null> => {
  const id = staffSessionId((await auth())?.user);
  if (!id) return null;
  const staff = await prisma.staffUser.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, active: true } });
  return toStaffUserSession(staff);
});

export async function requireStaffRole(allowedRoles: StaffRole[]) {
  const staffUser = await getStaffUser();
  if (!staffUser || !allowedRoles.includes(staffUser.role)) {
    throw new UnauthorizedError("Not authorized for this action.");
  }
  return staffUser;
}
