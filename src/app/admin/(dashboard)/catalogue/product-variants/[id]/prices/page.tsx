import { ArrowLeft } from "lucide-react";

import { getProductVariantPricePage } from "@/actions/product-variants/product-variants";
import { getProviders } from "@/actions/providers/providers";
import { AddOfferModal } from "@/components/admin/offer-form-modal";
import { PriceScheduleMenu } from "@/components/admin/price-schedule-menu";
import { VariantOffersTable } from "@/components/admin/variant-offers-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import Link from "@/components/Link";
import { effectivePriceCadence, ingredientLabels } from "@/lib/catalogue-labels";

import type { Metadata } from "next";

type VariantPricesPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata(props: VariantPricesPageProps): Promise<Metadata> {
  const { id } = await props.params;
  const variant = await getProductVariantPricePage(id);
  return { title: `${variant.brandName ?? ingredientLabels[variant.ingredient]} prices`, robots: { index: false, follow: false } };
}

export default async function ProductVariantPricesPage(props: VariantPricesPageProps) {
  const { id } = await props.params;
  const [variant, providers] = await Promise.all([getProductVariantPricePage(id), getProviders()]);
  const { offers: _offers, productMatches: _productMatches, ...variantFields } = variant;
  const formVariants = [variantFields];
  const providerOptions = providers
    .filter((provider) => provider.status !== "ARCHIVED")
    .map(({ id: providerId, tradingName, websiteDomain }) => ({ id: providerId, tradingName, websiteDomain }));
  const title = `${variant.brandName ?? ingredientLabels[variant.ingredient]} ${variant.strengthMg}mg × ${variant.packQuantity}`;

  return (
    <div className="space-y-6">
      <Link href="/admin/catalogue/product-variants" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-3.5" />
        Back to product variants
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest saved pharmacy prices, delivery charges and history for this exact variant.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0">
          <CardTitle>Pharmacy prices ({variant.offers.length})</CardTitle>
          <AddOfferModal providers={providerOptions} variants={formVariants} />
        </CardHeader>
        <CardContent className="px-0">
          {variant.offers.length === 0 ? (
            <EmptyState title="No saved prices for this variant yet." description="Add a price manually, or confirm pharmacy product matches for this variant and scrape prices from the Product variants list or the pharmacy page." />
          ) : (
            <VariantOffersTable offers={variant.offers} variants={formVariants} />
          )}
        </CardContent>
      </Card>

      {variant.productMatches.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Confirmed matches awaiting first saved price ({variant.productMatches.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {variant.productMatches.map((match) => (
              <div key={match.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{match.provider.tradingName}</p>
                  <a href={match.candidateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline">{match.candidateUrl}</a>
                </div>
                <div className="flex items-center gap-3">
                  <PriceScheduleMenu target={{ kind: "match", matchId: match.id }} current={effectivePriceCadence(match)} scope={`${match.provider.tradingName} only`} nextScrapeAt={match.nextScrapeAt} />
                  <Link href={`/admin/pharmacies/${match.provider.id}`} className="text-sm text-primary hover:underline">Open pharmacy</Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
