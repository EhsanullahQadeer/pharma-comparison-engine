"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { deleteOffer } from "@/actions/offers/offers";
import { Button } from "@/components/common/button";
import { confirm } from "@/lib/confirm-store";

export function OfferDeleteButton({ offerId, label }: { offerId: string; label: string }) {
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    const ok = await confirm({ title: "Remove this offer?", message: `"${label}" will be removed from this pharmacy.`, confirmText: "Remove", variant: "destructive" });
    if (!ok) return;
    startTransition(() => deleteOffer(offerId));
  }

  return (
    <Button type="button" variant="ghost" size="icon-sm" disabled={isPending} onClick={handleDelete}>
      <Trash2 aria-hidden="true" className="size-4" />
      <span className="sr-only">Remove offer</span>
    </Button>
  );
}
