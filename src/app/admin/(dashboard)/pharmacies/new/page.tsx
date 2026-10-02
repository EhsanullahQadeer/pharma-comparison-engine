import { getDiscoveryCandidateForPromotion } from "@/actions/discovery/discovery-candidates";
import { ProviderForm } from "@/components/admin/provider-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/card";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add pharmacy", robots: { index: false, follow: false } };

export default async function NewProviderPage({ searchParams }: { searchParams: Promise<{ fromCandidate?: string }> }) {
  const { fromCandidate } = await searchParams;
  const candidate = fromCandidate ? await getDiscoveryCandidateForPromotion(fromCandidate) : null;

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Add a pharmacy</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {candidate
            ? `Prefilled from a ${candidate.name} discovery candidate — confirm and complete the remaining details from verified public evidence.`
            : "Enter details from verified public evidence (regulator record, provider website)."}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Provider details</CardTitle>
          <CardDescription>Regulator reference and website domain are used to detect duplicates.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProviderForm
            fromCandidateId={candidate?.id}
            defaultValues={candidate ? { tradingName: candidate.name, websiteDomain: candidate.websiteDomain ?? undefined } : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
