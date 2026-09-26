"use client";

import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import type { PublicFormState } from "@/actions/submissions/public-submissions";
import { Button } from "@/components/common/button";
import FORM from "@/components/common/form";

import type { ReactNode } from "react";
import type { FieldValues } from "react-hook-form";
import type { z } from "zod";

// Shared shell for the public forms: FORM/zod validation (the server re-validates with the same
// schema), a hidden honeypot and a render timestamp for src/lib/spam-guard.ts, and a success state.
export function PublicForm<T extends { nickname?: string; startedAt: number }>({ schema, action, defaultValues, submitLabel, success, children }: {
  schema: z.ZodObject<z.ZodRawShape>;
  action: (values: T) => Promise<PublicFormState>;
  defaultValues: FieldValues;
  submitLabel: string;
  success: { title: string; body: string };
  children: ReactNode;
}) {
  const clientSchema = useMemo(() => schema.omit({ nickname: true, startedAt: true }), [schema]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const honeypot = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ sent: boolean; pending: boolean; error?: string }>({ sent: false, pending: false });

  const handleSubmit = useCallback(async (values: FieldValues) => {
    setStatus({ sent: false, pending: true });
    // react-hook-form values are untyped; the action re-validates them with the same schema.
    const result = await action({ ...values, nickname: honeypot.current?.value ?? "", startedAt } as T);
    setStatus({ sent: !!result.ok, pending: false, error: result.error });
    return result.ok ? { status: 200 } : undefined;
  }, [action, startedAt]);

  if (status.sent) {
    return (
      <div role="status" className="rounded-3xl border border-primary/40 bg-primary/10 p-8 text-center motion-safe:animate-fade-up">
        <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-primary" />
        <h2 className="mt-4 text-xl font-semibold">{success.title}</h2>
        <p className="mt-2 text-muted-foreground">{success.body}</p>
        <Button type="button" variant="outline" className="mt-6 rounded-full" onClick={() => { setStartedAt(Date.now()); setStatus({ sent: false, pending: false }); }}>Send another</Button>
      </div>
    );
  }

  return (
    <FORM schema={clientSchema} defaultValues={defaultValues} onSubmit={handleSubmit} className="gap-5 rounded-3xl border border-border bg-card p-6 shadow-(--shadow) sm:p-8">
      {/* Honeypot: visually hidden and skipped by keyboard/screen readers; only bots fill it. */}
      <div aria-hidden="true" className="sr-only">
        <label>Leave this empty<input ref={honeypot} type="text" name="nickname" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {children}
      {status.error ? <p role="alert" className="text-sm text-destructive">{status.error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Please don&apos;t include health details. We don&apos;t need them to answer you.</p>
        <Button type="submit" size="lg" disabled={status.pending} className="rounded-full px-6">
          {status.pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
          {submitLabel}
        </Button>
      </div>
    </FORM>
  );
}
