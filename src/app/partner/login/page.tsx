import { redirect } from "next/navigation";

import { partnerSignIn } from "@/actions/auth/sign-in";
import { LoginForm } from "@/components/admin/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/card";
import { getPartnerUser } from "@/lib/partner-auth";
import { siteConfig } from "@/lib/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pharmacy portal sign in", robots: { index: false, follow: false } };

export default async function PartnerLoginPage() {
  // getPartnerUser, not auth(): a switched-off or lapsed account must see the form, not loop.
  if (await getPartnerUser()) redirect("/partner");

  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center bg-background px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1><CardTitle>{siteConfig.brandShortName} pharmacy portal</CardTitle></h1>
          <CardDescription>For partner pharmacies: see the visitors we send to your website.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm action={partnerSignIn} emailLabel="Your email" />
          <p className="text-xs text-muted-foreground">Accounts are by invitation from our partnerships team. Use the link in your invite email to set your password.</p>
        </CardContent>
      </Card>
    </main>
  );
}
