import { getCorrections } from "@/actions/corrections/corrections";
import { getDiscoveryCandidatesForReview } from "@/actions/discovery/discovery-candidates";
import { getPendingEvidence } from "@/actions/evidence/evidence";
import { ReviewsTabs } from "@/components/admin/reviews-tabs";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reviews", robots: { index: false, follow: false } };

export default async function ReviewsPage() {
  const [evidence, corrections, candidates] = await Promise.all([
    getPendingEvidence(),
    getCorrections(),
    getDiscoveryCandidatesForReview(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evidence awaiting approval, corrections reported by the public, and pharmacy candidates found by automatic discovery.
        </p>
      </div>
      <ReviewsTabs evidence={evidence} corrections={corrections} candidates={candidates} />
    </div>
  );
}
