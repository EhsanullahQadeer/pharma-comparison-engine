"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useState } from "react";

import { createOffer, updateOffer, type OfferState } from "@/actions/offers/offers";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import Modal, { DialogContent, DialogHeader, DialogTitle } from "@/components/common/modal";
import type { Offer, ProductVariant } from "@/generated/prisma/client";
import { useCloseModalOnSuccess } from "@/hooks/useCloseModalOnSuccess";
import { availabilityLabels, availabilityValues, ingredientLabels, purchaseModelLabels, purchaseModelValues } from "@/lib/catalogue-labels";

const initialState: OfferState = {};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

function toDateInputValue(date?: Date | null) {
  if (!date) return undefined;
  return new Date(date).toISOString().slice(0, 10);
}

function OfferForm({
  providerId,
  variants,
  offer,
  onClose,
}: {
  providerId: string;
  variants: ProductVariant[];
  offer?: Offer;
  onClose: () => void;
}) {
  const action = offer ? updateOffer.bind(null, offer.id, providerId) : createOffer.bind(null, providerId);
  const [state, formAction, pending] = useActionState(action, initialState);
  useCloseModalOnSuccess(state, pending, onClose);

  let submitLabel = offer ? "Save changes" : "Add offer";
  if (pending) submitLabel = "Saving…";

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="productVariantId">Product variant</Label>
        <select
          id="productVariantId"
          name="productVariantId"
          required
          defaultValue={offer?.productVariantId ?? variants[0]?.id}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {ingredientLabels[variant.ingredient]} {variant.strengthMg}mg × {variant.packQuantity} ({variant.formulation})
            </option>
          ))}
        </select>
        <FieldError messages={state.fieldErrors?.productVariantId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="itemPricePence">Item price (pence)</Label>
          <Input id="itemPricePence" name="itemPricePence" type="number" min={0} defaultValue={offer?.itemPricePence} required />
          <FieldError messages={state.fieldErrors?.itemPricePence} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="deliveryFeePence">Delivery fee (pence)</Label>
          <Input id="deliveryFeePence" name="deliveryFeePence" type="number" min={0} defaultValue={offer?.deliveryFeePence ?? 0} />
          <FieldError messages={state.fieldErrors?.deliveryFeePence} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="consultationFeePence">Consultation fee (pence)</Label>
          <Input id="consultationFeePence" name="consultationFeePence" type="number" min={0} defaultValue={offer?.consultationFeePence ?? 0} />
          <FieldError messages={state.fieldErrors?.consultationFeePence} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="otherMandatoryFeesPence">Other mandatory fees (pence)</Label>
          <Input id="otherMandatoryFeesPence" name="otherMandatoryFeesPence" type="number" min={0} defaultValue={offer?.otherMandatoryFeesPence ?? 0} />
          <FieldError messages={state.fieldErrors?.otherMandatoryFeesPence} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="deliveryAssumption">Delivery assumption</Label>
        <Input id="deliveryAssumption" name="deliveryAssumption" placeholder="1 pack, standard delivery" defaultValue={offer?.deliveryAssumption} required />
        <FieldError messages={state.fieldErrors?.deliveryAssumption} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="availability">Availability</Label>
          <select
            id="availability"
            name="availability"
            required
            defaultValue={offer?.availability ?? "UNKNOWN"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {availabilityValues.map((value) => (
              <option key={value} value={value}>{availabilityLabels[value]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="purchaseModel">Purchase model</Label>
          <select
            id="purchaseModel"
            name="purchaseModel"
            required
            defaultValue={offer?.purchaseModel ?? "ONE_OFF"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {purchaseModelValues.map((value) => (
              <option key={value} value={value}>{purchaseModelLabels[value]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="billingPeriodDays">Billing period (days, recurring only)</Label>
        <Input id="billingPeriodDays" name="billingPeriodDays" type="number" min={1} defaultValue={offer?.billingPeriodDays ?? undefined} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sourceUrl">Source URL</Label>
          <Input id="sourceUrl" name="sourceUrl" type="url" placeholder="https://…" defaultValue={offer?.sourceUrl} required />
          <FieldError messages={state.fieldErrors?.sourceUrl} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="retrievedAt">Retrieved on</Label>
          <Input id="retrievedAt" name="retrievedAt" type="date" defaultValue={toDateInputValue(offer?.retrievedAt) ?? toDateInputValue(new Date())} required />
          <FieldError messages={state.fieldErrors?.retrievedAt} />
        </div>
      </div>

      {!!state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending}>{submitLabel}</Button>
      </div>
    </form>
  );
}

export function AddOfferModal({ providerId, variants }: { providerId: string; variants: ProductVariant[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" disabled={variants.length === 0}>
          <Plus aria-hidden="true" className="size-4" />
          Add offer
        </Button>
      }
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add an offer</DialogTitle>
        </DialogHeader>
        <OfferForm providerId={providerId} variants={variants} onClose={() => setOpen(false)} />
      </DialogContent>
    </Modal>
  );
}

export function EditOfferModal({ providerId, variants, offer }: { providerId: string; variants: ProductVariant[]; offer: Offer }) {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="ghost" size="icon-sm">
          <Pencil aria-hidden="true" className="size-4" />
          <span className="sr-only">Edit offer</span>
        </Button>
      }
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit offer</DialogTitle>
        </DialogHeader>
        <OfferForm providerId={providerId} variants={variants} offer={offer} onClose={() => setOpen(false)} />
      </DialogContent>
    </Modal>
  );
}
