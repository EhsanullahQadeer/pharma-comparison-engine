"use client";

import { useMemo } from "react";

import { SelectAllCheckbox } from "@/components/admin/bulk-action-bar";
import { OfferDeleteButton } from "@/components/admin/offer-delete-button";
import { OfferDiscountsModal } from "@/components/admin/offer-discounts-modal";
import { AddOfferModal, EditOfferModal } from "@/components/admin/offer-form-modal";
import { OfferPublishToggle, PublishAllOffersButton } from "@/components/admin/offer-publish-controls";
import { PriceBulkActions } from "@/components/admin/price-bulk-actions";
import { Badge } from "@/components/common/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { Checkbox } from "@/components/common/checkbox";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import type { Discount, Offer, ProductVariant } from "@/generated/prisma/client";
import { useRowSelection } from "@/hooks/useRowSelection";
import { availabilityBadgeVariant, availabilityLabels, ingredientLabels, purchaseModelLabels } from "@/lib/catalogue-labels";
import { deliveredTotalPence } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import type { BulkPriceRow } from "@/types/pricing";

const bulkActions = ["publish", "schedule", "scrape", "delete"] as const;

type OfferWithRelations = Offer & { productVariant: ProductVariant; discounts: Discount[]; productMatch: { id: string } | null };

export function ProviderOffersSection({ providerId, providerPublished, offers, variants }: { providerId: string; providerPublished: boolean; offers: OfferWithRelations[]; variants: ProductVariant[] }) {
  const draftCount = offers.filter((offer) => !offer.publishedAt).length;
  const ids = useMemo(() => offers.map((offer) => offer.id), [offers]);
  const selection = useRowSelection(ids);
  const selectedRows = useMemo<BulkPriceRow[]>(
    () => offers
      .filter((offer) => selection.selectedIds.includes(offer.id))
      .map((offer) => ({ offerId: offer.id, matchId: offer.productMatch?.id ?? null, published: !!offer.publishedAt, providerPublished })),
    [offers, selection.selectedIds, providerPublished],
  );
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Offers</CardTitle>
        <div className="flex flex-wrap items-start justify-end gap-2">
          <PublishAllOffersButton providerId={providerId} draftCount={draftCount} providerPublished={providerPublished} />
          <AddOfferModal providerId={providerId} variants={variants} />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {offers.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {variants.length === 0 ? "Add a product variant to the catalogue before pricing an offer." : "No offers yet."}
          </p>
        ) : (
          <>
            <PriceBulkActions rows={selectedRows} actions={bulkActions} onClear={selection.clear} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" resizable={false}>
                    <SelectAllCheckbox allSelected={selection.allSelected} someSelected={selection.someSelected} onToggleAll={selection.toggleAll} label="Select all offers" />
                  </TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Item price</TableHead>
                  <TableHead>Delivered total</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Public site</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer) => {
                  const deliveredTotal = deliveredTotalPence(offer);
                  const selected = selection.isSelected(offer.id);
                  return (
                    <TableRow key={offer.id} data-state={selected ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox checked={selected} onCheckedChange={(checked) => selection.toggle(offer.id, checked === true)} aria-label={`Select ${ingredientLabels[offer.productVariant.ingredient]} ${offer.productVariant.strengthMg}mg × ${offer.productVariant.packQuantity}`} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {ingredientLabels[offer.productVariant.ingredient]} {offer.productVariant.strengthMg}mg × {offer.productVariant.packQuantity}
                      </TableCell>
                      <TableCell>{formatPence(offer.itemPricePence)}</TableCell>
                      <TableCell className="font-medium">{formatPence(deliveredTotal)}</TableCell>
                      <TableCell>
                        <Badge variant={availabilityBadgeVariant[offer.availability]}>{availabilityLabels[offer.availability]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{purchaseModelLabels[offer.purchaseModel]}</TableCell>
                      <TableCell>
                        <Badge variant={offer.publishedAt ? "default" : "secondary"}>{offer.publishedAt ? "Published" : "Draft"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <OfferPublishToggle offerId={offer.id} published={!!offer.publishedAt} providerPublished={providerPublished} />
                          <OfferDiscountsModal offerId={offer.id} providerId={providerId} discounts={offer.discounts} />
                          <EditOfferModal variants={variants} offer={offer} tracked={!!offer.productMatch} />
                          <OfferDeleteButton
                            offerId={offer.id}
                            label={`${ingredientLabels[offer.productVariant.ingredient]} ${offer.productVariant.strengthMg}mg`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
