"use client";

import { useState } from "react";

import { CorrectionReviewTable } from "@/components/admin/correction-review-table";
import { DiscoveryCandidatesPanel } from "@/components/admin/discovery-candidates-panel";
import { EvidenceReviewTable } from "@/components/admin/evidence-review-table";
import { ProductMatchReviewTable } from "@/components/admin/product-match-review-table";
import { Button } from "@/components/common/button";

import type { ComponentProps, ReactNode } from "react";

type Tab = "evidence" | "corrections" | "candidates" | "productMatches";

export function ReviewsTabs({
  evidence,
  corrections,
  candidates,
  reviewedCandidates,
  productMatches,
  productVariants,
}: {
  evidence: ComponentProps<typeof EvidenceReviewTable>["items"];
  corrections: ComponentProps<typeof CorrectionReviewTable>["items"];
  candidates: ComponentProps<typeof DiscoveryCandidatesPanel>["pending"];
  reviewedCandidates: ComponentProps<typeof DiscoveryCandidatesPanel>["reviewed"];
  productMatches: ComponentProps<typeof ProductMatchReviewTable>["items"];
  productVariants: ComponentProps<typeof ProductMatchReviewTable>["variants"];
}) {
  const [tab, setTab] = useState<Tab>("evidence");

  const panels: Record<Tab, () => ReactNode> = {
    evidence: () => <EvidenceReviewTable items={evidence} />,
    corrections: () => <CorrectionReviewTable items={corrections} />,
    candidates: () => <DiscoveryCandidatesPanel pending={candidates} reviewed={reviewedCandidates} />,
    productMatches: () => <ProductMatchReviewTable items={productMatches} variants={productVariants} />,
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap rounded-lg border border-border p-1">
        <Button type="button" size="sm" variant={tab === "evidence" ? "secondary" : "ghost"} onClick={() => setTab("evidence")}>
          Evidence ({evidence.length})
        </Button>
        <Button type="button" size="sm" variant={tab === "corrections" ? "secondary" : "ghost"} onClick={() => setTab("corrections")}>
          Corrections ({corrections.length})
        </Button>
        <Button type="button" size="sm" variant={tab === "candidates" ? "secondary" : "ghost"} onClick={() => setTab("candidates")}>
          Discovery candidates ({candidates.length})
        </Button>
        <Button type="button" size="sm" variant={tab === "productMatches" ? "secondary" : "ghost"} onClick={() => setTab("productMatches")}>
          Product matches ({productMatches.length})
        </Button>
      </div>
      {panels[tab]()}
    </div>
  );
}
