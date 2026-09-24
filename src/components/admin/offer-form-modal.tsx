"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useState } from "react";

import { createOffer, updateOffer, type OfferState } from "@/actions/offers/offers";
import { Button } from "@/components/common/button";
import { Checkbox } from "@/components/common/checkbox";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import Modal, { DialogContent, DialogHeader, DialogTitle } from "@/components/common/modal";
import type { Offer, ProductVariant } from "@/generated/prisma/client";
import { useCloseModalOnSuccess } from "@/hooks/useCloseModalOnSuccess";
import { availabilityLabels, availabilityValues, ingredientLabels, purchaseModelLabels, purchaseModelValues } from "@/lib/catalogue-labels";
import type { OfferProviderOption } from "@/types/pricing";

const initialState: OfferState = {};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

function toDateInputValue(date?: Date | null) {
  if (!date) return undefined;
  return new Date(date).toISOString().slice(0, 10);
}

type OfferTarget = {
  variants: ProductVariant[];
  // Fixed pharmacy (its detail page) — or, when omitted, staff pick one of `providers` (a variant's prices page).
  providerId?: string;
  providers?: OfferProviderOption[];
};

function OfferForm({
  providerId,
  providers = [],
  variants,
  offer: latestOffer,
  tracked = false,
  onClose,
}: OfferTarget & {
  offer?: Offer;
  tracked?: boolean;
  onClose: () => void;
}) {
  // Snapshot the offer the form opened with: saving revalidates the page and hands back the updated offer
  // while the modal is still closing, and Base UI's inputs warn if their defaultValue changes after mount.
  const [offer] = useState(latestOffer);
  const action = offer ? updateOffer.bind(null, offer.id) : createOffer;
  const [state, formAction, pending] = useActionState(action, initialState);
  useCloseModalOnSuccess(state, pending, onClose);

  let submitLabel = offer ? "Save changes" : "Add offer";
  if (pending) submitLabel = "Saving…";
  const fixedProviderId = offer?.providerId ?? providerId;

  return (
    <form action={formAction} className="space-y-5">
      {fixedProviderId ? (
        <input type="hidden" name="providerId" value={fixedProviderId} />
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="providerId">Pharmacy</Label>
          <select
            id="providerId"
            name="providerId"
            required
            defaultValue=""
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="" disabled>Choose a pharmacy…</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.tradingName} ({provider.websiteDomain})
              </option>
            ))}
          </select>
          <FieldError messages={state.fieldErrors?.providerId} />
        </div>
      )}

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
          <Label htmlFor="sourceUrl">Product page URL</Label>
          <Input id="sourceUrl" name="sourceUrl" type="url" placeholder="https://…" defaultValue={offer?.sourceUrl} required />
          <FieldError messages={state.fieldErrors?.sourceUrl} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="retrievedAt">Retrieved on</Label>
          <Input id="retrievedAt" name="retrievedAt" type="date" defaultValue={toDateInputValue(offer?.retrievedAt) ?? toDateInputValue(new Date())} required />
          <FieldError messages={state.fieldErrors?.retrievedAt} />
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <Checkbox name="trackProductPage" defaultChecked={offer ? tracked : true} className="mt-0.5" />
        <span>
          Keep this price updated from the product page
          <span className="block text-xs text-muted-foreground">
            Counts this pharmacy as a confirmed match for this product, so price scrapes go straight to the page above. Use the exact page for this strength and pack; untick if the price didn&apos;t come from a web page.
          </span>
        </span>
      </label>

      {!!state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending}>{submitLabel}</Button>
      </div>
    </form>
  );
}

export function AddOfferModal({ providerId, providers, variants }: OfferTarget) {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" disabled={variants.length === 0 || (!providerId && !providers?.length)}>
          <Plus aria-hidden="true" className="size-4" />
          Add offer
        </Button>
      }
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add an offer</DialogTitle>
        </DialogHeader>
        <OfferForm providerId={providerId} providers={providers} variants={variants} onClose={() => setOpen(false)} />
      </DialogContent>
    </Modal>
  );
}

// `tracked`: the offer is already linked to a confirmed product match (its checkbox starts ticked).
export function EditOfferModal({ variants, offer, tracked }: { variants: ProductVariant[]; offer: Offer; tracked: boolean }) {
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
        <OfferForm variants={variants} offer={offer} tracked={tracked} onClose={() => setOpen(false)} />
      </DialogContent>
    </Modal>
  );
}
