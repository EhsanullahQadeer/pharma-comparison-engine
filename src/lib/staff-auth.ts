import { auth } from "@/auth";
import type { StaffRole } from "@/generated/prisma/client";

export class UnauthorizedError extends Error {}

export async function requireStaffRole(allowedRoles: StaffRole[]) {
  const session = await auth();
  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    throw new UnauthorizedError("Not authorized for this action.");
  }
  return session.user;
}
