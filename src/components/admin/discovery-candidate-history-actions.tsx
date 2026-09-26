"use client";

import { RotateCcw, X } from "lucide-react";
import { useState, useTransition } from "react";

import { rejectPromotedDiscoveryCandidate, reopenRejectedDiscoveryCandidate, type ChangeReviewedDiscoveryCandidateState } from "@/actions/discovery/discovery-candidates";
import { Button } from "@/components/common/button";
import type { DiscoveryCandidateStatus } from "@/generated/prisma/client";
import { confirm, type ConfirmOptions } from "@/lib/confirm-store";

import type { LucideIcon } from "lucide-react";

type HistoryAction = {
  label: string;
  icon: LucideIcon;
  variant: "outline" | "destructive";
  confirm: ConfirmOptions;
  run: (candidateId: string) => Promise<ChangeReviewedDiscoveryCandidateState>;
};

// Only promoted and rejected decisions can be changed from the history tabs.
const historyActions: Partial<Record<DiscoveryCandidateStatus, HistoryAction>> = {
  REJECTED: {
    label: "Send back to pending",
    icon: RotateCcw,
    variant: "outline",
    confirm: {
      title: "Send back to pending?",
      message: "This candidate returns to the Pending queue so it can be promoted, linked or rejected again.",
      confirmText: "Send back",
    },
    run: reopenRejectedDiscoveryCandidate,
  },
  PROMOTED: {
    label: "Reject",
    icon: X,
    variant: "destructive",
    confirm: {
      title: "Reject this promoted candidate?",
      message: "The pharmacy created from this candidate will be archived and removed from every public listing. Its evidence and prices are kept, and it can be restored later from the Pharmacies page.",
      confirmText: "Reject and archive",
      variant: "destructive",
    },
    run: rejectPromotedDiscoveryCandidate,
  },
};

export function hasDiscoveryCandidateHistoryAction(status: DiscoveryCandidateStatus) {
  return status in historyActions;
}

export function DiscoveryCandidateHistoryActions({ candidateId, status }: { candidateId: string; status: DiscoveryCandidateStatus }) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const action = historyActions[status];
  if (!action) return null;

  async function handleClick(selected: HistoryAction) {
    if (!(await confirm(selected.confirm))) return;
    setError(undefined);
    startTransition(async () => {
      const result = await selected.run(candidateId);
      if (result.error) setError(result.error);
    });
  }

  const Icon = action.icon;
  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant={action.variant} disabled={isPending} onClick={() => handleClick(action)}>
        <Icon aria-hidden="true" className="size-3.5" />
        {action.label}
      </Button>
      {error ? <p className="max-w-56 text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
