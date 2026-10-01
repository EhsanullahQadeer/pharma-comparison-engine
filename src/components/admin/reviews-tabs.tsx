"use client";

import { Search } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { CorrectionReviewTable } from "@/components/admin/correction-review-table";
import { DiscoveryCandidatesPanel } from "@/components/admin/discovery-candidates-panel";
import { EvidenceReviewTable } from "@/components/admin/evidence-review-table";
import { ProductMatchReviewTable } from "@/components/admin/product-match-review-table";
import { Button } from "@/components/common/button";
import InputField from "@/components/common/input";
import { filterBySearch } from "@/lib/text-search";

import type { ComponentProps, ReactNode } from "react";

const tabs = ["evidence", "corrections", "candidates", "productMatches"] as const;
type Tab = (typeof tabs)[number];

// A link into the page (e.g. from the pending-work bell) may name the tab to open.
function tabFrom(value: string | undefined): Tab {
  return tabs.find((tab) => tab === value) ?? "evidence";
}

export function ReviewsTabs({
  initialTab,
  evidence,
  corrections,
  candidates,
  reviewedCandidates,
  productMatches,
  productVariants,
}: {
  initialTab?: string;
  evidence: ComponentProps<typeof EvidenceReviewTable>["items"];
  corrections: ComponentProps<typeof CorrectionReviewTable>["items"];
  candidates: ComponentProps<typeof DiscoveryCandidatesPanel>["pending"];
  reviewedCandidates: ComponentProps<typeof DiscoveryCandidatesPanel>["reviewed"];
  productMatches: ComponentProps<typeof ProductMatchReviewTable>["items"];
  productVariants: ComponentProps<typeof ProductMatchReviewTable>["variants"];
}) {
  const [tab, setTab] = useState<Tab>(() => tabFrom(initialTab));
  const [query, setQuery] = useState("");
  // Deferred so typing stays responsive while the larger candidate lists re-filter.
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(
    () => ({
      evidence: filterBySearch(evidence, deferredQuery),
      corrections: filterBySearch(corrections, deferredQuery),
      candidates: filterBySearch(candidates, deferredQuery),
      reviewedCandidates: filterBySearch(reviewedCandidates, deferredQuery),
      productMatches: filterBySearch(productMatches, deferredQuery),
    }),
    [evidence, corrections, candidates, reviewedCandidates, productMatches, deferredQuery],
  );

  const panels: Record<Tab, () => ReactNode> = {
    evidence: () => <EvidenceReviewTable items={filtered.evidence} />,
    corrections: () => <CorrectionReviewTable items={filtered.corrections} />,
    candidates: () => <DiscoveryCandidatesPanel pending={filtered.candidates} reviewed={filtered.reviewedCandidates} />,
    productMatches: () => <ProductMatchReviewTable items={filtered.productMatches} variants={productVariants} />,
  };

  return (
    <div className="space-y-4">
      <InputField
        type="text"
        label="Search reviews"
        hideLabel
        placeholder="Search by pharmacy, domain, postcode, URL…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        preIcon={<Search className="size-4" />}
        className="w-full sm:max-w-sm"
      />
      <div className="inline-flex flex-wrap rounded-lg border border-border p-1">
        <Button type="button" size="sm" variant={tab === "evidence" ? "secondary" : "ghost"} onClick={() => setTab("evidence")}>
          Evidence ({filtered.evidence.length})
        </Button>
        <Button type="button" size="sm" variant={tab === "corrections" ? "secondary" : "ghost"} onClick={() => setTab("corrections")}>
          Corrections ({filtered.corrections.length})
        </Button>
        <Button type="button" size="sm" variant={tab === "candidates" ? "secondary" : "ghost"} onClick={() => setTab("candidates")}>
          Discovery candidates ({filtered.candidates.length})
        </Button>
        <Button type="button" size="sm" variant={tab === "productMatches" ? "secondary" : "ghost"} onClick={() => setTab("productMatches")}>
          Product matches ({filtered.productMatches.length})
        </Button>
      </div>
      {panels[tab]()}
    </div>
  );
}
