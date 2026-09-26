"use client";

import { Tag, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import { createDiscount, deleteDiscount, type DiscountState } from "@/actions/discounts/discounts";
import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import Modal, { DialogContent, DialogHeader, DialogTitle } from "@/components/common/modal";
import type { Discount } from "@/generated/prisma/client";
import { useCloseModalOnSuccess } from "@/hooks/useCloseModalOnSuccess";
import { discountValueTypeLabels, discountValueTypeValues } from "@/lib/catalogue-labels";
import { confirm } from "@/lib/confirm-store";
import { formatPence } from "@/lib/money";

const initialState: DiscountState = {};

function DiscountRow({ discount, providerId }: { discount: Discount; providerId: string }) {
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    const ok = await confirm({ message: `Remove the "${discount.eligibility}" discount?`, confirmText: "Remove", variant: "destructive" });
    if (!ok) return;
    startTransition(() => deleteDiscount(discount.id, providerId));
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
      <div>
        <p className="font-medium">{discount.eligibility}</p>
        {discount.code ? <p className="font-mono text-xs">Code: {discount.code}</p> : null}
        <p className="text-xs text-muted-foreground">
          {discount.valueType === "PERCENT" ? `${discount.valuePercent}%` : formatPence(discount.valuePence ?? 0)}
          {discount.stackable ? " · Stackable" : ""}
          {discount.expiresAt ? ` · Expires ${new Date(discount.expiresAt).toLocaleDateString("en-GB")}` : ""}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" disabled={isPending} onClick={handleDelete}>
        <Trash2 aria-hidden="true" className="size-4" />
        <span className="sr-only">Remove discount</span>
      </Button>
    </li>
  );
}

function AddDiscountForm({ offerId, providerId, onAdded }: { offerId: string; providerId: string; onAdded: () => void }) {
  const [state, formAction, pending] = useActionState(createDiscount.bind(null, offerId, providerId), initialState);
  useCloseModalOnSuccess(state, pending, onAdded);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-dashed border-border p-3">
      <div className="space-y-1.5">
        <Label htmlFor={`eligibility-${offerId}`}>Who qualifies</Label>
        <Input id={`eligibility-${offerId}`} name="eligibility" placeholder="First-time customers" required />
        {state.fieldErrors?.eligibility?.[0] ? <p className="text-sm text-destructive">{state.fieldErrors.eligibility[0]}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`code-${offerId}`}>Discount code (leave blank if applied automatically)</Label>
        <Input id={`code-${offerId}`} name="code" placeholder="WELCOME10" />
        {state.fieldErrors?.code?.[0] ? <p className="text-sm text-destructive">{state.fieldErrors.code[0]}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`valueType-${offerId}`}>Type</Label>
          <select
            id={`valueType-${offerId}`}
            name="valueType"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            defaultValue={discountValueTypeValues[0]}
          >
            {discountValueTypeValues.map((value) => (
              <option key={value} value={value}>{discountValueTypeLabels[value]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`valuePercent-${offerId}`}>Percent</Label>
          <Input id={`valuePercent-${offerId}`} name="valuePercent" type="number" min={0} max={100} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`valuePence-${offerId}`}>Fixed amount (pence, if applicable)</Label>
        <Input id={`valuePence-${offerId}`} name="valuePence" type="number" min={0} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="stackable" className="size-4 rounded border-input" />
        Stackable with other discounts
      </label>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.fieldErrors?.valueType?.[0] ? <p className="text-sm text-destructive">{state.fieldErrors.valueType[0]}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Adding…" : "Add discount"}</Button>
    </form>
  );
}

export function OfferDiscountsModal({ offerId, providerId, discounts }: { offerId: string; providerId: string; discounts: Discount[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="outline" size="sm">
          <Tag aria-hidden="true" className="size-3.5" />
          Discounts
          {discounts.length > 0 && <Badge variant="secondary">{discounts.length}</Badge>}
        </Button>
      }
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Discounts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {discounts.length > 0 ? (
            <ul className="space-y-2">
              {discounts.map((discount) => (
                <DiscountRow key={discount.id} discount={discount} providerId={providerId} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No discounts on this offer yet.</p>
          )}
          <AddDiscountForm key={discounts.length} offerId={offerId} providerId={providerId} onAdded={() => {}} />
        </div>
      </DialogContent>
    </Modal>
  );
}
