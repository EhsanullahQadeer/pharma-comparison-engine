import { ArrowLeft, Globe, MapPin, ShieldCheck } from "lucide-react";

import { getPendingPriceCollectionForProvider } from "@/actions/price-collection/price-collection";
import { getProviderSiteOffers } from "@/actions/price-collection/site-offers";
import { getProductMatchesForReview } from "@/actions/product-matches/product-matches";
import { getAllProductVariants } from "@/actions/product-variants/product-variants";
import { getProvider } from "@/actions/providers/providers";
import { getAffiliateProgramme } from "@/actions/referrals/programmes";
import { AffiliateProgrammeCard } from "@/components/admin/affiliate-programme-card";
import { DetectProductsButton } from "@/components/admin/detect-products-button";
import { EditPharmacyModal } from "@/components/admin/edit-pharmacy-modal";
import { ProductMatchPricingSection } from "@/components/admin/product-match-pricing-section";
import { ProductMatchReviewTable } from "@/components/admin/product-match-review-table";
import { ProviderLinkToggle } from "@/components/admin/provider-link-toggle";
import { ProviderOffersSection } from "@/components/admin/provider-offers-section";
import { ProviderSiteOffersSection } from "@/components/admin/provider-site-offers-section";
import { ProviderStatusControl } from "@/components/admin/provider-status-control";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import Link from "@/components/Link";
import { regulatorTypeLabels } from "@/lib/provider-labels";
import { correctionStatusBadgeVariant, correctionStatusLabels, evidenceApprovalStatusBadgeVariant, evidenceApprovalStatusLabels } from "@/lib/review-labels";
import { getStaffUser } from "@/lib/staff-auth";

import type { Metadata } from "next";

export async function generateMetadata(props: PageProps<"/admin/pharmacies/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const provider = await getProvider(id);
  return { title: provider.tradingName, robots: { index: false, follow: false } };
}

export default async function ProviderDetailPage(props: PageProps<"/admin/pharmacies/[id]">) {
  const { id } = await props.params;
  const [provider, variants, staffUser, pendingMatches, programme, siteOffers] = await Promise.all([
    getProvider(id),
    getAllProductVariants(),
    getStaffUser(),
    getPendingPriceCollectionForProvider(id),
    getAffiliateProgramme(id),
    getProviderSiteOffers(id),
  ]);
  const canEditCommercial = staffUser?.role === "COMMERCIAL_MANAGER" || staffUser?.role === "ADMINISTRATOR";
  // Detected matches awaiting a decision, confirmed here next to the price collection list.
  const canReviewMatches = staffUser?.role === "CATALOGUE_EDITOR" || staffUser?.role === "ADMINISTRATOR";
  const suggestedMatches = canReviewMatches ? await getProductMatchesForReview(id) : [];

  return (
    <div className="space-y-6">
      <Link href="/admin/pharmacies" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Back to pharmacies
      </Link>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{provider.tradingName}</h1>
              <p className="text-sm text-muted-foreground">{provider.legalName}</p>
            </div>
            <EditPharmacyModal provider={provider} />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href={`https://${provider.websiteDomain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground hover:underline"><Globe aria-hidden="true" className="size-3.5" />{provider.websiteDomain}</a>
            <span className="flex items-center gap-1.5"><ShieldCheck aria-hidden="true" className="size-3.5" />{regulatorTypeLabels[provider.regulatorType]} · {provider.regulatorReference}</span>
            {provider.serviceRegions.length > 0 && (
              <span className="flex items-center gap-1.5"><MapPin aria-hidden="true" className="size-3.5" />{provider.serviceRegions.join(", ")}</span>
            )}
          </div>

          {staffUser ? (
            <div className="border-t border-border pt-4">
              <ProviderStatusControl providerId={provider.id} status={provider.status} role={staffUser.role} />
            </div>
          ) : null}

          <div className="border-t border-border pt-4">
            <ProviderLinkToggle key={String(provider.affiliateApproved)} providerId={provider.id} affiliateApproved={provider.affiliateApproved} />
          </div>
        </CardContent>
      </Card>

      <AffiliateProgrammeCard
        providerId={provider.id}
        providerName={provider.tradingName}
        programme={programme}
        sampleUrl={provider.offers[0]?.sourceUrl ?? null}
        canEdit={canEditCommercial}
      />

      <div className="flex items-center justify-end">
        <DetectProductsButton providerId={provider.id} />
      </div>

      <ProviderOffersSection providerId={provider.id} providerPublished={provider.status === "PUBLISHED"} offers={provider.offers} variants={variants} />

      <ProviderSiteOffersSection providerId={provider.id} siteOffers={siteOffers} canReview={canReviewMatches} />

      {suggestedMatches.length > 0 && (
        <ProductMatchReviewTable items={suggestedMatches} variants={variants} title="Suggested product matches" showProvider={false} />
      )}

      <ProductMatchPricingSection items={pendingMatches} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {provider.evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">No evidence recorded for this provider.</p>
            ) : (
              provider.evidence.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="truncate text-muted-foreground">{item.sourceUrl}</span>
                  <Badge variant={evidenceApprovalStatusBadgeVariant[item.approvedStatus]}>{evidenceApprovalStatusLabels[item.approvedStatus]}</Badge>
                </div>
              ))
            )}
            <Link href="/admin/reviews" className="inline-block text-sm text-primary hover:underline">Review evidence →</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Corrections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {provider.corrections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No corrections reported for this provider.</p>
            ) : (
              provider.corrections.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="truncate text-muted-foreground">{item.reportedIssue}</span>
                  <Badge variant={correctionStatusBadgeVariant[item.status]}>{correctionStatusLabels[item.status]}</Badge>
                </div>
              ))
            )}
            <Link href="/admin/reviews" className="inline-block text-sm text-primary hover:underline">Review corrections →</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
