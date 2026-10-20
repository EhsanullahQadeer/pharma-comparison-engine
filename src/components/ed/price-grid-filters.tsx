"use client";

import { SlidersHorizontal } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/common/button";
import { Checkbox } from "@/components/common/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/common/sheet";
import type { PaymentMethod, PurchaseModel } from "@/generated/prisma/client";
import { useRouter } from "@/hooks/useRouter";
import { gridFlagParams, paymentMethodSlugs, publicPurchaseModelLabels, purchaseModelSlugs, slugify, trustpilotMinimums } from "@/lib/comparison";
import { paymentMethodLabels, paymentMethodValues, serviceRegionOptions } from "@/lib/provider-labels";
import { cn } from "@/lib/utils";
import type { GridFilterFlags } from "@/types/comparison";

type Draft = GridFilterFlags & { purchaseModel?: PurchaseModel; region?: string; payment?: PaymentMethod; minTrustpilot?: number };

// Only filters on data we actually hold. Nothing here may read as a way round the pharmacy's
// clinical checks (no "accepts heart conditions", "no ID check" and the like).
const flagLabels: Record<keyof GridFilterFlags, { label: string; hint: string }> = {
  inStock: { label: "In stock only", hint: "Hide prices the pharmacy shows as out of stock." },
  freeDelivery: { label: "Free delivery", hint: "Delivery costs nothing, and we've checked the pharmacy's fees." },
  noConsultation: { label: "No consultation fee", hint: "No separate charge for the online consultation." },
  verifiedOnly: { label: "Checked fees only", hint: "Hide indicative prices (marked *) whose fees we haven't checked yet." },
  hasDiscount: { label: "Has a discount", hint: "The pharmacy has a current discount we've checked." },
  nextDay: { label: "Next-day delivery", hint: "The pharmacy offers next-day delivery." },
  discreet: { label: "Discreet packaging", hint: "The pharmacy says it sends orders in plain packaging." },
  inspectionPassed: { label: "Passed its last GPhC inspection", hint: "The regulator's last inspection found the standards were met." },
};
const flagKeys = Object.keys(flagLabels) as (keyof GridFilterFlags)[];
// Plain literal (not a value import of the Prisma enum, which would pull server code into the
// browser bundle). Keep in sync with PurchaseModel.
const planValues: PurchaseModel[] = ["ONE_OFF", "RECURRING"];

// A row of single-choice pills ("Any" first), one group in the drawer.
function ChoiceGroup<T extends string | number>({ legend, value, options, onChange }: { legend: string; value?: T; options: { value: T; label: string }[]; onChange: (value?: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {[{ value: undefined, label: "Any" }, ...options].map((option) => (
          <button
            key={String(option.value ?? "any")}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn("rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring", value === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const planOptions = planValues.map((value) => ({ value, label: publicPurchaseModelLabels[value] }));
const regionOptions = serviceRegionOptions.map((region) => ({ value: region as string, label: region }));
const paymentOptions = paymentMethodValues.map((value) => ({ value, label: paymentMethodLabels[value] }));
const trustpilotOptions = trustpilotMinimums.map((tenths) => ({ value: tenths, label: `${(tenths / 10).toFixed(1)}+` }));

// The "Filters" drawer: choices are drafted here and only applied (as URL parameters, so the grid
// re-renders on the server) on Apply. `baseHref` is the current view with every filter cleared.
export function PriceGridFilters({ baseHref, current, activeCount, showTrustpilot }: { baseHref: string; current: Draft; activeCount: number; showTrustpilot: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(current);
  const set = useCallback(<K extends keyof Draft>(key: K) => (value?: Draft[K]) => setDraft((previous) => ({ ...previous, [key]: value })), []);

  const onOpenChange = useCallback((next: boolean) => {
    // Re-opening starts from what is applied, not from an abandoned draft.
    if (next) setDraft(current);
    setOpen(next);
  }, [current]);

  const apply = useCallback(() => {
    const url = new URL(baseHref, window.location.origin);
    for (const key of flagKeys) if (draft[key]) url.searchParams.set(...gridFlagParams[key]);
    if (draft.purchaseModel) url.searchParams.set("plan", purchaseModelSlugs[draft.purchaseModel]);
    if (draft.region) url.searchParams.set("region", slugify(draft.region));
    if (draft.payment) url.searchParams.set("payment", paymentMethodSlugs[draft.payment]);
    if (draft.minTrustpilot) url.searchParams.set("trustpilot", String(draft.minTrustpilot / 10));
    setOpen(false);
    router.push(`${url.pathname}${url.search}`, { scroll: false });
  }, [baseHref, draft, router]);

  return (
    <>
      <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => onOpenChange(true)}>
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </Button>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Narrow the grid. Prices are still ranked by price only.</SheetDescription>
          </SheetHeader>
          <div className="space-y-6 px-4">
            <ul className="space-y-4">
              {flagKeys.map((key) => (
                <li key={key}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox checked={Boolean(draft[key])} onCheckedChange={(checked) => setDraft((value) => ({ ...value, [key]: checked }))} className="mt-0.5" />
                    <span>
                      <span className="block font-medium">{flagLabels[key].label}</span>
                      <span className="block text-xs text-muted-foreground">{flagLabels[key].hint}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <ChoiceGroup legend="Delivers to" value={draft.region} options={regionOptions} onChange={set("region")} />
            <ChoiceGroup legend="Pay with" value={draft.payment} options={paymentOptions} onChange={set("payment")} />
            {showTrustpilot ? <ChoiceGroup legend="Trustpilot score" value={draft.minTrustpilot} options={trustpilotOptions} onChange={set("minTrustpilot")} /> : null}
            <ChoiceGroup legend="Buying" value={draft.purchaseModel} options={planOptions} onChange={set("purchaseModel")} />
            <p className="text-xs text-muted-foreground">Pharmacy facts are recorded by our team from each pharmacy&apos;s site and the GPhC register. A pharmacy we haven&apos;t recorded a fact for doesn&apos;t match that filter.</p>
          </div>
          <SheetFooter className="flex-row gap-2">
            <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={() => setDraft({})}>Reset</Button>
            <Button type="button" className="flex-1 rounded-full" onClick={apply}>Apply</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
