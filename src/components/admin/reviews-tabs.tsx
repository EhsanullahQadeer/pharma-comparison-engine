"use client";

import { useState } from "react";

import { CorrectionReviewTable } from "@/components/admin/correction-review-table";
import { DiscoveryCandidateReviewTable } from "@/components/admin/discovery-candidate-review-table";
import { EvidenceReviewTable } from "@/components/admin/evidence-review-table";
import { Button } from "@/components/common/button";

import type { ComponentProps, ReactNode } from "react";

type Tab = "evidence" | "corrections" | "candidates";

export function ReviewsTabs({
  evidence,
  corrections,
  candidates,
}: {
  evidence: ComponentProps<typeof EvidenceReviewTable>["items"];
  corrections: ComponentProps<typeof CorrectionReviewTable>["items"];
  candidates: ComponentProps<typeof DiscoveryCandidateReviewTable>["items"];
}) {
  const [tab, setTab] = useState<Tab>("evidence");

  const panels: Record<Tab, () => ReactNode> = {
    evidence: () => <EvidenceReviewTable items={evidence} />,
    corrections: () => <CorrectionReviewTable items={corrections} />,
    candidates: () => <DiscoveryCandidateReviewTable items={candidates} />,
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-border p-1">
        <Button type="button" size="sm" variant={tab === "evidence" ? "secondary" : "ghost"} onClick={() => setTab("evidence")}>
          Evidence ({evidence.length})
        </Button>
        <Button type="button" size="sm" variant={tab === "corrections" ? "secondary" : "ghost"} onClick={() => setTab("corrections")}>
          Corrections ({corrections.length})
        </Button>
        <Button type="button" size="sm" variant={tab === "candidates" ? "secondary" : "ghost"} onClick={() => setTab("candidates")}>
          Discovery candidates ({candidates.length})
        </Button>
      </div>
      {panels[tab]()}
    </div>
  );
}
