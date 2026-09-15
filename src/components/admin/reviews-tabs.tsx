"use client";

import { useState } from "react";

import { CorrectionReviewTable } from "@/components/admin/correction-review-table";
import { EvidenceReviewTable } from "@/components/admin/evidence-review-table";
import { Button } from "@/components/common/button";

import type { ComponentProps } from "react";

type Tab = "evidence" | "corrections";

export function ReviewsTabs({
  evidence,
  corrections,
}: {
  evidence: ComponentProps<typeof EvidenceReviewTable>["items"];
  corrections: ComponentProps<typeof CorrectionReviewTable>["items"];
}) {
  const [tab, setTab] = useState<Tab>("evidence");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-border p-1">
        <Button type="button" size="sm" variant={tab === "evidence" ? "secondary" : "ghost"} onClick={() => setTab("evidence")}>
          Evidence ({evidence.length})
        </Button>
        <Button type="button" size="sm" variant={tab === "corrections" ? "secondary" : "ghost"} onClick={() => setTab("corrections")}>
          Corrections ({corrections.length})
        </Button>
      </div>
      {tab === "evidence" ? <EvidenceReviewTable items={evidence} /> : <CorrectionReviewTable items={corrections} />}
    </div>
  );
}
