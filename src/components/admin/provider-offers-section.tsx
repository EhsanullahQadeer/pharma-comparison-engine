"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { deleteOffer } from "@/actions/offers/offers";
import { OfferDiscountsModal } from "@/components/admin/offer-discounts-modal";
import { AddOfferModal, EditOfferModal } from "@/components/admin/offer-form-modal";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/common/table";
import type { Discount, Offer, ProductVariant } from "@/generated/prisma/client";
import { availabilityBadgeVariant, availabilityLabels, ingredientLabels, purchaseModelLabels } from "@/lib/catalogue-labels";
import { confirm } from "@/lib/confirm-store";
import { formatPence } from "@/lib/money";

type OfferWithRelations = Offer & { productVariant: ProductVariant; discounts: Discount[] };

function OfferDeleteButton({ offerId, providerId, label }: { offerId: string; providerId: string; label: string }) {
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    const ok = await confirm({ title: "Remove this offer?", message: `"${label}" will be removed from this pharmacy.`, confirmText: "Remove", variant: "destructive" });
    if (!ok) return;
    startTransition(() => deleteOffer(offerId, providerId));
  }

  return (
    <Button type="button" variant="ghost" size="icon-sm" disabled={isPending} onClick={handleDelete}>
      <Trash2 aria-hidden="true" className="size-4" />
      <span className="sr-only">Remove offer</span>
    </Button>
  );
}

export function ProviderOffersSection({ providerId, offers, variants }: { providerId: string; offers: OfferWithRelations[]; variants: ProductVariant[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Offers</CardTitle>
        <AddOfferModal providerId={providerId} variants={variants} />
      </CardHeader>
      <CardContent className="px-0">
        {offers.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {variants.length === 0 ? "Add a product variant to the catalogue before pricing an offer." : "No offers yet."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead>Item price</TableHead>
                <TableHead>Delivered total</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => {
                const deliveredTotal = offer.itemPricePence + offer.deliveryFeePence + offer.consultationFeePence + offer.otherMandatoryFeesPence;
                return (
                  <TableRow key={offer.id}>
                    <TableCell className="font-medium">
                      {ingredientLabels[offer.productVariant.ingredient]} {offer.productVariant.strengthMg}mg × {offer.productVariant.packQuantity}
                    </TableCell>
                    <TableCell>{formatPence(offer.itemPricePence)}</TableCell>
                    <TableCell className="font-medium">{formatPence(deliveredTotal)}</TableCell>
                    <TableCell>
                      <Badge variant={availabilityBadgeVariant[offer.availability]}>{availabilityLabels[offer.availability]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{purchaseModelLabels[offer.purchaseModel]}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <OfferDiscountsModal offerId={offer.id} providerId={providerId} discounts={offer.discounts} />
                        <EditOfferModal providerId={providerId} variants={variants} offer={offer} />
                        <OfferDeleteButton
                          offerId={offer.id}
                          providerId={providerId}
                          label={`${ingredientLabels[offer.productVariant.ingredient]} ${offer.productVariant.strengthMg}mg`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
