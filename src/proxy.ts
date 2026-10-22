import { NextResponse } from "next/server";

import { auth } from "@/auth";

// Convenience redirects only — the authoritative checks are getStaffUser() (src/lib/staff-auth.ts)
// in the admin layout and every staff action, and getPartnerUser() (src/lib/partner-auth.ts) in the
// partner layout and every partner action, since Server Functions can bypass proxy matchers. Each
// area only accepts its own kind of session: a partner is never let into /admin, nor staff into /partner.
const areas = [
  { prefix: "/admin", kind: "staff", open: (path: string) => path === "/admin/login" },
  { prefix: "/partner", kind: "partner", open: (path: string) => path === "/partner/login" || path.startsWith("/partner/invite/") },
] as const;

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const area = areas.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (area && !area.open(pathname) && req.auth?.user?.kind !== area.kind) {
    return NextResponse.redirect(new URL(`${area.prefix}/login`, req.nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*", "/partner/:path*"],
};
