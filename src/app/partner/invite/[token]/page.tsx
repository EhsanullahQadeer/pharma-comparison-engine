import { LinkIcon } from "lucide-react";

import { getPartnerInvite } from "@/actions/partners/partner-invite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { SetPasswordForm } from "@/components/partner/set-password-form";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Set up your pharmacy portal account", robots: { index: false, follow: false } };

export default async function PartnerInvitePage(props: PageProps<"/partner/invite/[token]">) {
  const { token } = await props.params;
  const invite = await getPartnerInvite(token);

  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center bg-background px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1><CardTitle>Set up your portal account</CardTitle></h1>
          {invite ? <CardDescription>{invite.name}, choose a password for {invite.email} to see {invite.providerName}&apos;s figures.</CardDescription> : null}
        </CardHeader>
        <CardContent>
          {invite ? (
            <SetPasswordForm token={token} email={invite.email} />
          ) : (
            <EmptyState icon={LinkIcon} title="This invite link has expired or was already used." description="Invite links work once and for 7 days. Ask our partnerships team for a new one, or sign in if you've already set your password." />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
