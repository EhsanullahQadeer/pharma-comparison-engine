import type { StaffRole } from "@/generated/prisma/client";

// A verified staff member for this request: taken from a staff session and re-read from the
// database, so deactivation and role changes apply immediately.
export type StaffUserSession = {
  kind: "staff";
  id: string;
  role: StaffRole;
  name: string;
  email: string;
};
