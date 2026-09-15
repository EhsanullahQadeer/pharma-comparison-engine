"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useState } from "react";

import { createProductVariant, updateProductVariant, type ProductVariantState } from "@/actions/product-variants/product-variants";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import Modal, { DialogContent, DialogHeader, DialogTitle } from "@/components/common/modal";
import type { ProductVariant } from "@/generated/prisma/client";
import { useCloseModalOnSuccess } from "@/hooks/useCloseModalOnSuccess";
import { ingredientLabels, ingredientValues, supplyClassificationLabels, supplyClassificationValues } from "@/lib/catalogue-labels";

const initialState: ProductVariantState = {};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

function ProductVariantForm({ variant, onClose }: { variant?: ProductVariant; onClose: () => void }) {
  const action = variant ? updateProductVariant.bind(null, variant.id) : createProductVariant;
  const [state, formAction, pending] = useActionState(action, initialState);
  useCloseModalOnSuccess(state, pending, onClose);

  let submitLabel = variant ? "Save changes" : "Add variant";
  if (pending) submitLabel = "Saving…";

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ingredient">Ingredient</Label>
          <select
            id="ingredient"
            name="ingredient"
            required
            defaultValue={variant?.ingredient ?? ingredientValues[0]}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {ingredientValues.map((value) => (
              <option key={value} value={value}>{ingredientLabels[value]}</option>
            ))}
          </select>
          <FieldError messages={state.fieldErrors?.ingredient} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brandName">Brand name (if any)</Label>
          <Input id="brandName" name="brandName" defaultValue={variant?.brandName ?? undefined} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="strengthMg">Strength (mg)</Label>
          <Input id="strengthMg" name="strengthMg" type="number" min={1} defaultValue={variant?.strengthMg} required />
          <FieldError messages={state.fieldErrors?.strengthMg} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="packQuantity">Pack quantity</Label>
          <Input id="packQuantity" name="packQuantity" type="number" min={1} defaultValue={variant?.packQuantity} required />
          <FieldError messages={state.fieldErrors?.packQuantity} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="formulation">Formulation</Label>
        <Input id="formulation" name="formulation" placeholder="Film-coated tablet" defaultValue={variant?.formulation} required />
        <FieldError messages={state.fieldErrors?.formulation} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="supplyClassification">Supply classification</Label>
        <select
          id="supplyClassification"
          name="supplyClassification"
          required
          defaultValue={variant?.supplyClassification ?? supplyClassificationValues[0]}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          {supplyClassificationValues.map((value) => (
            <option key={value} value={value}>{supplyClassificationLabels[value]}</option>
          ))}
        </select>
        <FieldError messages={state.fieldErrors?.supplyClassification} />
      </div>

      {!!state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={pending}>{submitLabel}</Button>
      </div>
    </form>
  );
}

export function AddProductVariantModal() {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button">
          <Plus aria-hidden="true" className="size-4" />
          Add variant
        </Button>
      }
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a product variant</DialogTitle>
        </DialogHeader>
        <ProductVariantForm onClose={() => setOpen(false)} />
      </DialogContent>
    </Modal>
  );
}

export function EditProductVariantModal({ variant }: { variant: ProductVariant }) {
  const [open, setOpen] = useState(false);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="ghost" size="icon-sm">
          <Pencil aria-hidden="true" className="size-4" />
          <span className="sr-only">Edit variant</span>
        </Button>
      }
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit product variant</DialogTitle>
        </DialogHeader>
        <ProductVariantForm variant={variant} onClose={() => setOpen(false)} />
      </DialogContent>
    </Modal>
  );
}
