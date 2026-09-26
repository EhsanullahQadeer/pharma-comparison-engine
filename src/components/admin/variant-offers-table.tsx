"use client";

import { ExternalLink } from "lucide-react";
import { useMemo } from "react";

import type { getProductVariantPricePage } from "@/actions/product-variants/product-variants";
import { SelectAllCheckbox } from "@/components/admin/bulk-action-bar";
import { OfferDeleteButton } from "@/components/admin/offer-delete-button";
import { EditOfferModal } from "@/components/admin/offer-form-modal";
import { PriceBulkActions } from "@/components/admin/price-bulk-actions";
import { PriceScheduleMenu } from "@/components/admin/price-schedule-menu";
import { ProductVariantPriceHistoryModal } from "@/components/admin/product-variant-price-history-modal";
import { Badge } from "@/components/common/badge";
import { Checkbox } from "@/components/common/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import type { ProductVariant } from "@/generated/prisma/client";
import { useRowSelection } from "@/hooks/useRowSelection";
import { effectivePriceCadence } from "@/lib/catalogue-labels";
import { formatPence } from "@/lib/money";
import type { BulkPriceRow } from "@/types/pricing";

type VariantOffer = Awaited<ReturnType<typeof getProductVariantPricePage>>["offers"][number];

const bulkActions = ["publish", "schedule", "scrape", "delete"] as const;

function formatDate(value: Date | null): string {
  return value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not set";
}

function statusLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ").toLowerCase() : "not configured";
}

export function VariantOffersTable({ offers, variants }: { offers: VariantOffer[]; variants: ProductVariant[] }) {
  const ids = useMemo(() => offers.map((offer) => offer.id), [offers]);
  const selection = useRowSelection(ids);
  const selectedRows = useMemo<BulkPriceRow[]>(() => {
    const byId = new Map(offers.map((offer) => [offer.id, offer]));
    return selection.selectedIds.flatMap((id) => {
      const offer = byId.get(id);
      return offer ? [{ offerId: offer.id, matchId: offer.productMatch?.id ?? null, published: !!offer.publishedAt, providerPublished: offer.provider.status === "PUBLISHED" }] : [];
    });
  }, [offers, selection.selectedIds]);

  return (
    <>
      <PriceBulkActions rows={selectedRows} actions={bulkActions} onClear={selection.clear} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" resizable={false}>
              <SelectAllCheckbox allSelected={selection.allSelected} someSelected={selection.someSelected} onToggleAll={selection.toggleAll} label="Select all prices" />
            </TableHead>
            <TableHead style={{ width: 190 }}>Pharmacy</TableHead>
            <TableHead style={{ width: 190 }}>Product page</TableHead>
            <TableHead style={{ width: 100 }}>Item price</TableHead>
            <TableHead style={{ width: 100 }}>Delivery</TableHead>
            <TableHead style={{ width: 100 }}>Total</TableHead>
            <TableHead style={{ width: 160 }}>Last updated</TableHead>
            <TableHead style={{ width: 150 }}>Scrape status</TableHead>
            <TableHead style={{ width: 160 }}>Schedule</TableHead>
            <TableHead style={{ width: 110 }}>Public site</TableHead>
            <TableHead className="text-right" style={{ width: 210 }}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => {
            const { provider: _provider, priceHistory: _priceHistory, productMatch: match, ...offerFields } = offer;
            const total = offer.itemPricePence + offer.deliveryFeePence + offer.consultationFeePence + offer.otherMandatoryFeesPence;
            const selected = selection.isSelected(offer.id);
            return (
              <TableRow key={offer.id} data-state={selected ? "selected" : undefined}>
                <TableCell>
                  <Checkbox checked={selected} onCheckedChange={(checked) => selection.toggle(offer.id, checked === true)} aria-label={`Select ${offer.provider.tradingName}`} />
                </TableCell>
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
                  <Badge variant={match?.requiresHumanAssist ? "destructive" : "secondary"}>{statusLabel(match?.lastScrapeStatus)}</Badge>
                </TableCell>
                <TableCell>
                  {match ? (
                    <PriceScheduleMenu
                      target={{ kind: "match", matchId: match.id }}
                      current={effectivePriceCadence(match)}
                      scope={`${offer.provider.tradingName} only`}
                      nextScrapeAt={match.nextScrapeAt}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Not tracked</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={offer.publishedAt ? "default" : "secondary"}>{offer.publishedAt ? "Published" : "Draft"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <ProductVariantPriceHistoryModal pharmacyName={offer.provider.tradingName} history={offer.priceHistory} />
                    <EditOfferModal variants={variants} offer={offerFields} tracked={!!match} />
                    <OfferDeleteButton offerId={offer.id} label={offer.provider.tradingName} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
