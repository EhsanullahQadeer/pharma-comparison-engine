import type { StaffRole } from "@/generated/prisma/client";

// next-auth re-exports these as `export type { ... }`, which doesn't support declaration
// merging — the interfaces must be augmented where they're actually declared, in @auth/core.
declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      role: StaffRole;
      name: string;
      email: string;
    };
  }

  interface User {
    role: StaffRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    staffId: string;
    role: StaffRole;
  }
}
