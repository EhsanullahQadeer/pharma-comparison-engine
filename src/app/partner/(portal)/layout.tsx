import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";

import { partnerSignOut } from "@/actions/auth/sign-out";
import { Button } from "@/components/common/button";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { getPartnerUser } from "@/lib/partner-auth";
import { siteConfig } from "@/lib/site-config";

// The authoritative check for the pharmacy portal (the proxy only redirects): a partner account
// that is active, has set its password, and whose pharmacy is a partner or within its 90 days.
export default async function PartnerPortalLayout({ children }: LayoutProps<"/partner">) {
  const partner = await getPartnerUser();
  if (!partner) redirect("/partner/login");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{siteConfig.brandShortName} pharmacy portal</p>
            <p className="truncate text-xs text-muted-foreground">{partner.providerName} · {partner.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <form action={partnerSignOut}>
              <Button type="submit" size="sm" variant="outline"><LogOut aria-hidden="true" className="size-3.5" />Sign out</Button>
            </form>
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
