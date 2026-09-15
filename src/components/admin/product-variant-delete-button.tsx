"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { deleteProductVariant } from "@/actions/product-variants/product-variants";
import { Button } from "@/components/common/button";
import { confirm } from "@/lib/confirm-store";

export function ProductVariantDeleteButton({ id, label }: { id: string; label: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete this product variant?",
      message: `"${label}" will be permanently removed from the catalogue. This can't be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;

    setError(undefined);
    startTransition(async () => {
      const result = await deleteProductVariant(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <>
      <Button type="button" variant="ghost" size="icon-sm" disabled={isPending} onClick={handleDelete}>
        <Trash2 aria-hidden="true" className="size-4" />
        <span className="sr-only">Delete variant</span>
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </>
  );
}
