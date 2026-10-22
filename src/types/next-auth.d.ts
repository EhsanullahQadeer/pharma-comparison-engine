import type { StaffRole } from "@/generated/prisma/client";

// next-auth re-exports these as `export type { ... }`, which doesn't support declaration
// merging — the interfaces must be augmented where they're actually declared, in @auth/core.
// `kind` says which account table the session belongs to: staff, or a pharmacy's portal user
// (docs/partner-portal-plan.md). Never trust a bare auth(): use getStaffUser()/requireStaffRole for
// staff and getPartnerUser()/requirePartner for partners — both re-read the account from the database.
declare module "@auth/core/types" {
  interface Session {
    user: {
      // Optional: a session from a pre-`kind` token has none, and counts as neither.
      kind?: "staff" | "partner";
      id: string;
      // Staff sessions only.
      role?: StaffRole;
      name: string;
      email: string;
    };
  }

  interface User {
    // Always set by authorize(); optional only because the session callback's user type extends
    // User and must accept sessions from pre-`kind` tokens.
    kind?: "staff" | "partner";
    role?: StaffRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    // Absent on tokens issued before account kinds existed; those are treated as signed out.
    kind?: "staff" | "partner";
    // The account's id in its own table (StaffUser or PartnerUser). Named before partners existed.
    staffId: string;
    role?: StaffRole;
  }
}
