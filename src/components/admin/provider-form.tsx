"use client";

import { useActionState } from "react";
import { createProvider, type CreateProviderState } from "@/actions/providers/providers";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { regulatorTypeLabels, regulatorTypeValues } from "@/lib/provider-labels";

const initialState: CreateProviderState = {};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

export function ProviderForm() {
  const [state, formAction, pending] = useActionState(createProvider, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tradingName">Trading name</Label>
          <Input id="tradingName" name="tradingName" required />
          <FieldError messages={state.fieldErrors?.tradingName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="legalName">Legal (registered) name</Label>
          <Input id="legalName" name="legalName" required />
          <FieldError messages={state.fieldErrors?.legalName} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="websiteDomain">Website domain</Label>
        <Input id="websiteDomain" name="websiteDomain" placeholder="example-pharmacy.co.uk" required />
        <FieldError messages={state.fieldErrors?.websiteDomain} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="regulatorType">Regulator</Label>
          <select
            id="regulatorType"
            name="regulatorType"
            required
            defaultValue={regulatorTypeValues[0]}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {regulatorTypeValues.map((value) => (
              <option key={value} value={value}>{regulatorTypeLabels[value]}</option>
            ))}
          </select>
          <FieldError messages={state.fieldErrors?.regulatorType} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="regulatorReference">Regulator registration number</Label>
          <Input id="regulatorReference" name="regulatorReference" required />
          <FieldError messages={state.fieldErrors?.regulatorReference} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dispensingPartnerName">Dispensing partner (if different from trading name)</Label>
        <Input id="dispensingPartnerName" name="dispensingPartnerName" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="serviceRegions">Service regions</Label>
        <Input id="serviceRegions" name="serviceRegions" placeholder="England, Scotland, Wales" required />
        <p className="text-xs text-muted-foreground">Comma-separated.</p>
        <FieldError messages={state.fieldErrors?.serviceRegions} />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add pharmacy as discovered"}
      </Button>
      <p className="text-xs text-muted-foreground">
        New entries start as &ldquo;Discovered&rdquo;. Identity and ED-catalogue verification happen as separate review steps before publication.
      </p>
    </form>
  );
}
