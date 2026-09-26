import type { StaffRole } from "@/generated/prisma/client";
import type { StaffUserSession } from "@/types/auth";

type SessionUser = { kind?: string; id?: string } | null | undefined;
type StaffRecord = { id: string; name: string; email: string; role: StaffRole; active: boolean } | null;

// Pure rule behind getStaffUser (src/lib/staff-auth.ts): only a staff-kind session backed by an
// existing, active StaffUser counts, and identity/role come from the database record, not the token.
export function staffSessionId(user: SessionUser) {
  return user?.kind === "staff" && user.id ? user.id : null;
}

export function toStaffUserSession(staff: StaffRecord): StaffUserSession | null {
  if (!staff?.active) return null;
  return { kind: "staff", id: staff.id, name: staff.name, email: staff.email, role: staff.role };
}
