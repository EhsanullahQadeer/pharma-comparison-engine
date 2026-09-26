import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/card";
import { siteConfig } from "@/lib/site-config";
import { getStaffUser } from "@/lib/staff-auth";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  // getStaffUser, not auth(): a deactivated or non-staff session must see the form, or the admin
  // layout and this page would redirect to each other forever.
  if (await getStaffUser()) redirect("/admin");

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{siteConfig.brandShortName} staff</CardTitle>
          <CardDescription>Sign in to manage the pharmacy directory.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
