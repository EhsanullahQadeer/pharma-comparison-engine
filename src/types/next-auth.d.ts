import type { StaffRole } from "@/generated/prisma/client";

// next-auth re-exports these as `export type { ... }`, which doesn't support declaration
// merging — the interfaces must be augmented where they're actually declared, in @auth/core.
// `kind` says which account table the session belongs to. Only staff accounts exist today;
// partner-portal accounts will add a second kind (docs/partner-portal-plan.md), so anything
// staff-only must check it — use getStaffUser()/requireStaffRole, never a bare auth().
declare module "@auth/core/types" {
  interface Session {
    user: {
      // Optional: a session from a pre-`kind` token has none, and must not count as staff.
      kind?: "staff";
      id: string;
      role: StaffRole;
      name: string;
      email: string;
    };
  }

  interface User {
    // Always set by authorize(); optional only because the session callback's user type extends
    // User and must accept sessions from pre-`kind` tokens.
    kind?: "staff";
    role: StaffRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    // Absent on tokens issued before account kinds existed; those are treated as signed out.
    kind?: "staff";
    staffId: string;
    role: StaffRole;
  }
}
