"use client";

import { useState, useTransition } from "react";

import { setProviderAffiliateApproved } from "@/actions/providers/providers";
import { Checkbox } from "@/components/common/checkbox";
import { Label } from "@/components/common/label";

// Affiliated pharmacies get a website link on public pages; the rest stay listed without one.
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
        <Label htmlFor="affiliateApproved">Affiliate partner — link to this pharmacy&apos;s website</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Off: listed and priced on the public site as normal, with no link to its website. Never changes ranking.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
