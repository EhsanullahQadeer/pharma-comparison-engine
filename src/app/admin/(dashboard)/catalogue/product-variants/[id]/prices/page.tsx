import { ArrowLeft, ExternalLink } from "lucide-react";

import { getProductVariantPricePage } from "@/actions/product-variants/product-variants";
import { ProductVariantPriceHistoryModal } from "@/components/admin/product-variant-price-history-modal";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { EmptyState } from "@/components/common/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import Link from "@/components/Link";
import { ingredientLabels } from "@/lib/catalogue-labels";

import type { Metadata } from "next";

type VariantPricesPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata(props: VariantPricesPageProps): Promise<Metadata> {
  const { id } = await props.params;
  const variant = await getProductVariantPricePage(id);
  return { title: `${variant.brandName ?? ingredientLabels[variant.ingredient]} prices`, robots: { index: false, follow: false } };
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function formatDate(value: Date | null): string {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

function statusLabel(value?: string) {
  return value ? value.replaceAll("_", " ").toLowerCase() : "not configured";
}

export default async function ProductVariantPricesPage(props: VariantPricesPageProps) {
  const { id } = await props.params;
  const variant = await getProductVariantPricePage(id);
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
        <CardHeader>
          <CardTitle>Pharmacy prices ({variant.offers.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {variant.offers.length === 0 ? (
            <EmptyState title="No saved prices for this variant yet." description="Confirm pharmacy product matches for this variant, then scrape prices from the Product variants list or the pharmacy page." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pharmacy</TableHead>
                  <TableHead>Product page</TableHead>
                  <TableHead>Item price</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variant.offers.map((offer) => {
                  const match = offer.productMatch;
                  const total = offer.itemPricePence + offer.deliveryFeePence + offer.consultationFeePence + offer.otherMandatoryFeesPence;
                  return (
                    <TableRow key={offer.id}>
                      <TableCell>
                        <div className="space-y-1 whitespace-normal!">
                          <p className="font-medium">{offer.provider.tradingName}</p>
                          <p className="text-xs text-muted-foreground">{offer.provider.websiteDomain}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        <a href={match?.candidateUrl ?? offer.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                          {match?.candidateUrl ?? offer.sourceUrl}
                          <ExternalLink aria-hidden="true" className="size-3" />
                        </a>
                      </TableCell>
                      <TableCell>{formatPence(offer.itemPricePence)}</TableCell>
                      <TableCell>{formatPence(offer.deliveryFeePence)}</TableCell>
                      <TableCell>{formatPence(total)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(offer.updatedAt)}</TableCell>
                      <TableCell>
                        <Badge variant={match?.requiresHumanAssist ? "destructive" : "secondary"}>{statusLabel(match?.lastScrapeStatus ?? undefined)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ProductVariantPriceHistoryModal pharmacyName={offer.provider.tradingName} history={offer.priceHistory} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
                <Link href={`/admin/pharmacies/${match.provider.id}`} className="text-sm text-primary hover:underline">Open pharmacy</Link>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
