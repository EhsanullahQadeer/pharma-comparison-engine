"use client";

import { Check, Copy, MailPlus, RotateCw } from "lucide-react";
import { useCallback, useState } from "react";

import { partnerInviteSchema } from "@/actions/partners/partner-schemas";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import FORM, { FormFeilds } from "@/components/common/form";
import InputField from "@/components/common/input";
import { useMutate } from "@/hooks/useMutate";
import { confirm } from "@/lib/confirm-store";
import { partnerAccountStatusBadgeVariant, partnerAccountStatusLabels } from "@/lib/partner-labels";
import type { PartnerInviteResult, ProviderPartnerUser } from "@/types/partners";

import type { FieldValues } from "react-hook-form";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });

// What happened to the last invite: emailed, or a one-time link for staff to send themselves.
function InviteOutcome({ result }: { result: PartnerInviteResult }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    if (!result.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [result.inviteUrl]);

  if (result.emailed) return <p role="status" className="text-sm text-muted-foreground">Invite emailed. The link works once and expires in 7 days.</p>;
  if (!result.inviteUrl) return null;
  return (
    <div role="status" className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
      <p>Send this one-time link to them yourself (email isn&apos;t set up here). It expires in 7 days and isn&apos;t shown again.</p>
      <div className="flex gap-2">
        <input readOnly value={result.inviteUrl} aria-label="Invite link" className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs" onFocus={(event) => event.currentTarget.select()} />
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function AccountRow({ account, canManage, onInvite }: { account: ProviderPartnerUser; canManage: boolean; onInvite: (result: PartnerInviteResult) => void }) {
  const resend = useMutate("resendPartnerInvite", { onSuccess: onInvite });
  const toggle = useMutate("setPartnerUserActive");
  const switchOff = account.status !== "ACCESS_OFF";
  const { mutate: runToggle } = toggle;
  const onToggle = useCallback(async () => {
    if (switchOff && !(await confirm({ title: "Turn off portal access?", message: `${account.name} won't be able to sign in until access is turned back on. Their account and past figures are kept.`, confirmText: "Turn off", variant: "destructive" }))) return;
    runToggle(account.id, !switchOff);
  }, [account.id, account.name, runToggle, switchOff]);
  const canResend = account.status === "INVITED" || account.status === "INVITE_EXPIRED";
  const error = resend.data?.error ?? toggle.data?.error;

  return (
    <li className="space-y-2 border-b border-border py-3 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{account.name}</p>
          <p className="text-sm break-all text-muted-foreground">{account.email}</p>
          <p className="text-xs text-muted-foreground">
            {account.lastLoginAt ? `Last signed in ${dateFormat.format(account.lastLoginAt)}` : `Invited ${dateFormat.format(account.invitedAt)}`}
            {account.status === "INVITED" && account.inviteExpiresAt ? ` · invite expires ${dateFormat.format(account.inviteExpiresAt)}` : ""}
          </p>
        </div>
        <Badge variant={partnerAccountStatusBadgeVariant[account.status]}>{partnerAccountStatusLabels[account.status]}</Badge>
      </div>
      {canManage ? (
        <div className="flex flex-wrap gap-2">
          {canResend ? (
            <Button type="button" size="sm" variant="outline" disabled={resend.isPending} onClick={() => resend.mutate(account.id)}>
              <RotateCw aria-hidden="true" className="size-3.5" />{resend.isPending ? "Sending…" : "Resend invite"}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" disabled={toggle.isPending} onClick={onToggle}>
            {switchOff ? "Turn off access" : "Turn access back on"}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </li>
  );
}

// Who at this pharmacy can use its own portal (traffic figures only; docs/partner-portal-plan.md).
// Invites are for affiliate partners only; after a partnership ends, access continues read-only for
// 90 days and then stops on its own.
export function PartnerAccessCard({ providerId, accounts, isPartner, canManage }: { providerId: string; accounts: ProviderPartnerUser[]; isPartner: boolean; canManage: boolean }) {
  const [lastInvite, setLastInvite] = useState<PartnerInviteResult>();
  const invite = useMutate("invitePartnerUser", { onSuccess: setLastInvite });
  const { mutateAsync: sendInvite } = invite;
  const onSubmit = useCallback(async (values: FieldValues) => {
    const result = await sendInvite(providerId, { name: String(values.name ?? ""), email: String(values.email ?? "") });
    return result.error ? undefined : { status: 200 };
  }, [providerId, sendInvite]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pharmacy portal access</CardTitle>
        <p className="text-xs text-muted-foreground">
          People at this pharmacy who can sign in at /partner to see the visitors we send them. They only ever see this pharmacy&apos;s own figures.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.length > 0 ? (
          <ul aria-label="Portal accounts">
            {accounts.map((account) => <AccountRow key={account.id} account={account} canManage={canManage} onInvite={setLastInvite} />)}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No one at this pharmacy has portal access yet.</p>
        )}
        {invite.data?.error ? <p className="text-sm text-destructive">{invite.data.error}</p> : null}
        {lastInvite ? <InviteOutcome key={lastInvite.inviteUrl ?? "emailed"} result={lastInvite} /> : null}
        {canManage && isPartner ? (
          <FORM schema={partnerInviteSchema} defaultValues={{ name: "", email: "" }} onSubmit={onSubmit} className="gap-3 border-t border-border pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormFeilds fieldProps={{ name: "name" }} label={{ text: "Name" }} required>
                {(field) => <InputField type="text" bare {...field} value={field.value ?? ""} autoComplete="off" />}
              </FormFeilds>
              <FormFeilds fieldProps={{ name: "email" }} label={{ text: "Their email" }} required>
                {(field) => <InputField type="email" bare {...field} value={field.value ?? ""} autoComplete="off" />}
              </FormFeilds>
            </div>
            <Button type="submit" size="sm" className="w-fit" disabled={invite.isPending}>
              <MailPlus aria-hidden="true" className="size-3.5" />{invite.isPending ? "Inviting…" : "Invite to the portal"}
            </Button>
          </FORM>
        ) : null}
        {canManage && !isPartner ? <p className="text-sm text-muted-foreground">Only affiliate partners have a portal. Tick “Affiliate partner” above to invite someone.</p> : null}
      </CardContent>
    </Card>
  );
}
