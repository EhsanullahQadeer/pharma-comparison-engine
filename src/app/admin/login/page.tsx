import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/admin/login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/card";
import { siteConfig } from "@/lib/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");

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
