"use client";

import { useActionState } from "react";

import { staffSignIn, type SignInState } from "@/actions/auth/sign-in";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";

const initialState: SignInState = {};

// The staff login by default; the pharmacy portal passes its own sign-in action and label.
export function LoginForm({ action = staffSignIn, emailLabel = "Staff email" }: { action?: (state: SignInState, formData: FormData) => Promise<SignInState>; emailLabel?: string }) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">{emailLabel}</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {!!state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
