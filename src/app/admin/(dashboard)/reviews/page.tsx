import { getCorrections } from "@/actions/corrections/corrections";
import { getDiscoveryCandidatesForReview } from "@/actions/discovery/discovery-candidates";
import { getPendingEvidence } from "@/actions/evidence/evidence";
import { getProductMatchesForReview } from "@/actions/product-matches/product-matches";
import { getAllProductVariants } from "@/actions/product-variants/product-variants";
import { ReviewsTabs } from "@/components/admin/reviews-tabs";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reviews", robots: { index: false, follow: false } };

export default async function ReviewsPage() {
  const [evidence, corrections, candidates, productMatches, productVariants] = await Promise.all([
    getPendingEvidence(),
    getCorrections(),
    getDiscoveryCandidatesForReview(),
    getProductMatchesForReview(),
    getAllProductVariants(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Evidence awaiting approval, corrections reported by the public, pharmacy candidates found by automatic discovery, and detected product matches.
        </p>
      </div>
      <ReviewsTabs evidence={evidence} corrections={corrections} candidates={candidates} productMatches={productMatches} productVariants={productVariants} />
    </div>
  );
}
