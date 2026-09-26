"use client";

import { Eye, EyeOff, Globe } from "lucide-react";
import { useState, useTransition } from "react";

import { publishProviderOffers, setOfferPublished } from "@/actions/offers/offers";
import type { PublishOfferState } from "@/actions/offers/offers";
import { Button } from "@/components/common/button";
import TooltipWrapper from "@/components/common/TooltipWrapper";

const NOT_PUBLISHED_HINT = "Publish the pharmacy first — its prices can only go public after that.";

function usePublishAction() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const run = (action: () => Promise<PublishOfferState>) =>
    startTransition(async () => {
      const result = await action();
      setError(result.error);
    });
  return { isPending, error, run };
}

export function OfferPublishToggle({ offerId, published, providerPublished }: { offerId: string; published: boolean; providerPublished: boolean }) {
  const { isPending, error, run } = usePublishAction();
  const disabled = isPending || (!published && !providerPublished);
  const label = published ? "Unpublish price" : "Publish price";

  return (
    <TooltipWrapper label={error ?? (disabled && !isPending ? NOT_PUBLISHED_HINT : label)}>
      <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} onClick={() => run(() => setOfferPublished(offerId, !published))}>
        {published ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        <span className="sr-only">{label}</span>
      </Button>
    </TooltipWrapper>
  );
}

export function PublishAllOffersButton({ providerId, draftCount, providerPublished, compact = false }: { providerId: string; draftCount: number; providerPublished: boolean; compact?: boolean }) {
  const { isPending, error, run } = usePublishAction();
  if (draftCount === 0) return null;

  const hint = providerPublished ? `Make ${draftCount} draft price${draftCount === 1 ? "" : "s"} visible on the public site` : NOT_PUBLISHED_HINT;
  if (compact) {
    return (
      <TooltipWrapper label={error ?? hint}>
        <Button type="button" variant="ghost" size="icon-sm" disabled={isPending || !providerPublished} onClick={() => run(() => publishProviderOffers(providerId))}>
          <Globe aria-hidden="true" className="size-4" />
          <span className="sr-only">Publish all {draftCount} draft prices</span>
        </Button>
      </TooltipWrapper>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <TooltipWrapper label={hint}>
        <Button type="button" variant="outline" size="sm" disabled={isPending || !providerPublished} onClick={() => run(() => publishProviderOffers(providerId))}>
          <Globe aria-hidden="true" className="size-4" />
          Publish all ({draftCount})
        </Button>
      </TooltipWrapper>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
