"use client";

import { useState, useTransition } from "react";

import { setProviderAffiliateApproved } from "@/actions/providers/providers";
import { Checkbox } from "@/components/common/checkbox";
import { Label } from "@/components/common/label";

// Every published pharmacy is linked on public pages; affiliated ones are labelled as partners.
export function ProviderLinkToggle({ providerId, affiliateApproved }: { providerId: string; affiliateApproved: boolean }) {
  const [checked, setChecked] = useState(affiliateApproved);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setError(undefined);
    setChecked(next);
    startTransition(async () => {
      const result = await setProviderAffiliateApproved(providerId, next);
      if (result.error) {
        setChecked(!next);
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Checkbox id="affiliateApproved" checked={checked} disabled={isPending} onCheckedChange={(value) => handleChange(value === true)} />
        <Label htmlFor="affiliateApproved">Affiliate partner — label this pharmacy&apos;s links as earning commission</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Off: still linked and its clicks counted, with no commission label and no tracked link. Never changes ranking.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
