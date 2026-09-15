import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Convenience redirect only — the authoritative role/session check lives in
// src/app/admin/layout.tsx, since Server Functions can bypass proxy matchers.
export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !isLoggedIn) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
