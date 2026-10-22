"use client";

import { CheckCircle2 } from "lucide-react";
import { useCallback } from "react";

import { partnerPasswordSchema } from "@/actions/partners/partner-schemas";
import { Button } from "@/components/common/button";
import FORM, { FormFeilds } from "@/components/common/form";
import InputField from "@/components/common/input";
import Link from "@/components/Link";
import { useMutate } from "@/hooks/useMutate";

import type { FieldValues } from "react-hook-form";

// Accepting a portal invite: the password is checked here and again by the action.
export function SetPasswordForm({ token, email }: { token: string; email: string }) {
  const accept = useMutate("acceptPartnerInvite");
  const { mutateAsync: acceptInvite } = accept;
  const onSubmit = useCallback(async (values: FieldValues) => {
    await acceptInvite(token, { password: String(values.password ?? ""), confirm: String(values.confirm ?? "") });
  }, [acceptInvite, token]);

  if (accept.data?.ok) {
    return (
      <div role="status" className="space-y-4 text-center">
        <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-primary" />
        <p>Your password is set. Sign in with {email}.</p>
        <Button nativeButton={false} render={<Link href="/partner/login">Go to sign in</Link>} />
      </div>
    );
  }

  return (
    <FORM schema={partnerPasswordSchema} defaultValues={{ password: "", confirm: "" }} onSubmit={onSubmit}>
      {/* Lets password managers save the login against the right email. */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <FormFeilds fieldProps={{ name: "password" }} label={{ text: "New password (at least 12 characters)" }} required>
        {(field) => <InputField type="password" bare {...field} value={field.value ?? ""} autoComplete="new-password" />}
      </FormFeilds>
      <FormFeilds fieldProps={{ name: "confirm" }} label={{ text: "Type it again" }} required>
        {(field) => <InputField type="password" bare {...field} value={field.value ?? ""} autoComplete="new-password" />}
      </FormFeilds>
      {accept.data?.error ? <p role="alert" className="text-sm text-destructive">{accept.data.error}</p> : null}
      <Button type="submit" disabled={accept.isPending}>{accept.isPending ? "Saving…" : "Set password"}</Button>
    </FORM>
  );
}
