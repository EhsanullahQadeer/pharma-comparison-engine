"use server";

import { signOut } from "@/auth";

export async function staffSignOut() {
  await signOut({ redirectTo: "/admin/login" });
}

export async function partnerSignOut() {
  await signOut({ redirectTo: "/partner/login" });
}
