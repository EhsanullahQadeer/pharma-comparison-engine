"use client";

import { useMemo, useState } from "react";

import { DiscoveryCandidateHistoryTable } from "@/components/admin/discovery-candidate-history-table";
import { DiscoveryCandidateReviewTable } from "@/components/admin/discovery-candidate-review-table";
import { DiscoveryCandidatesBacklogCheckActions } from "@/components/admin/discovery-candidates-backlog-check-actions";
import { Button } from "@/components/common/button";

import type { ComponentProps, ReactNode } from "react";

type StatusTab = "pending" | "promoted" | "linked" | "rejected";

type HistoryItems = ComponentProps<typeof DiscoveryCandidateHistoryTable>["items"];

const tabLabels: Record<StatusTab, string> = {
  pending: "Pending",
  promoted: "Promoted",
  linked: "Linked",
  rejected: "Rejected",
};

// Pending is the actionable queue; the other three are history split by the decision staff made,
// so promoted/rejected candidates stay findable (and their decision reversible) after they leave it.
export function DiscoveryCandidatesPanel({
  pending,
  reviewed,
}: {
  pending: ComponentProps<typeof DiscoveryCandidateReviewTable>["items"];
  reviewed: HistoryItems;
}) {
  const [tab, setTab] = useState<StatusTab>("pending");

  const byDecision = useMemo(() => {
    const groups: Record<Exclude<StatusTab, "pending">, HistoryItems> = { promoted: [], linked: [], rejected: [] };
    const statusToTab = { PROMOTED: "promoted", LINKED_EXISTING: "linked", REJECTED: "rejected", NEW: undefined } as const;
    for (const item of reviewed) {
      const key = statusToTab[item.status];
      if (key) groups[key].push(item);
    }
    return groups;
  }, [reviewed]);

  const counts: Record<StatusTab, number> = {
    pending: pending.length,
    promoted: byDecision.promoted.length,
    linked: byDecision.linked.length,
    rejected: byDecision.rejected.length,
  };

  const panels: Record<StatusTab, () => ReactNode> = {
    pending: () => (
      <div className="space-y-4">
        <DiscoveryCandidatesBacklogCheckActions />
        <DiscoveryCandidateReviewTable items={pending} />
      </div>
    ),
    promoted: () => <DiscoveryCandidateHistoryTable title="Promoted candidates" items={byDecision.promoted} emptyTitle="No promoted candidates yet." />,
    linked: () => <DiscoveryCandidateHistoryTable title="Linked candidates" items={byDecision.linked} emptyTitle="No candidates linked to existing pharmacies yet." />,
    rejected: () => <DiscoveryCandidateHistoryTable title="Rejected candidates" items={byDecision.rejected} emptyTitle="No rejected candidates yet." />,
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap rounded-lg border border-border p-1">
        {(Object.keys(tabLabels) as StatusTab[]).map((key) => (
          <Button key={key} type="button" size="sm" variant={tab === key ? "secondary" : "ghost"} onClick={() => setTab(key)}>
            {tabLabels[key]} ({counts[key]})
          </Button>
        ))}
      </div>
      {panels[tab]()}
    </div>
  );
}
