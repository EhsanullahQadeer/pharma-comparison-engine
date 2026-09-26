"use client";

import { Check, RotateCcw, ShieldX } from "lucide-react";
import { useTransition } from "react";

import { setPublicSubmissionStatus } from "@/actions/submissions/public-submissions";
import { Button } from "@/components/common/button";
import type { PublicSubmissionStatus } from "@/generated/prisma/client";

const nextActions: Record<PublicSubmissionStatus, { status: PublicSubmissionStatus; label: string; icon: typeof Check }[]> = {
  NEW: [{ status: "HANDLED", label: "Mark handled", icon: Check }, { status: "SPAM", label: "Spam", icon: ShieldX }],
  HANDLED: [{ status: "NEW", label: "Reopen", icon: RotateCcw }],
  SPAM: [{ status: "NEW", label: "Not spam", icon: RotateCcw }],
};

export function SubmissionStatusActions({ id, status }: { id: string; status: PublicSubmissionStatus }) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      {nextActions[status].map(({ status: next, label, icon: Icon }) => (
        <Button key={next} type="button" size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(async () => { await setPublicSubmissionStatus(id, next); })}>
          <Icon aria-hidden="true" className="size-3.5" />
          {label}
        </Button>
      ))}
    </div>
  );
}
