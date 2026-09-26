import { NextResponse } from "next/server";

import { auth } from "@/auth";

// Convenience redirect only — the authoritative check is getStaffUser() (src/lib/staff-auth.ts) in
// the admin layout and every staff action, since Server Functions can bypass proxy matchers. Only a
// staff session counts: partner-portal accounts will share this login.
export default auth((req) => {
  const isStaff = req.auth?.user?.kind === "staff";
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !isStaff) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
