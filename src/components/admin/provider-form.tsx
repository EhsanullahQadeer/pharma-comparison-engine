"use client";

import { useActionState, useMemo, useState } from "react";

import { promoteDiscoveryCandidate } from "@/actions/discovery/discovery-candidates";
import { createProvider, updateProvider, type CreateProviderState } from "@/actions/providers/providers";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import type { Provider } from "@/generated/prisma/client";
import { regulatorTypeLabels, regulatorTypeValues, serviceRegionOptions } from "@/lib/provider-labels";

const initialState: CreateProviderState = {};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

type ProviderFormProps = {
  provider?: Pick<
    Provider,
    "id" | "tradingName" | "legalName" | "websiteDomain" | "regulatorType" | "regulatorReference" | "dispensingPartnerName" | "serviceRegions"
  >;
  // Prefill + a different submit action when this form is promoting a discovery candidate rather
  // than a from-scratch manual entry — mutually exclusive with `provider` (editing).
  fromCandidateId?: string;
  defaultValues?: { tradingName?: string; websiteDomain?: string };
};

function resolveFormAction(provider: ProviderFormProps["provider"], fromCandidateId: string | undefined) {
  if (fromCandidateId) return promoteDiscoveryCandidate.bind(null, fromCandidateId);
  if (provider) return updateProvider.bind(null, provider.id);
  return createProvider;
}

export function ProviderForm({ provider, fromCandidateId, defaultValues }: ProviderFormProps) {
  const action = resolveFormAction(provider, fromCandidateId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [serviceRegions, setServiceRegions] = useState(() => [...new Set(
    (provider?.serviceRegions ?? []).map(region => {
      const trimmed = region.trim();
      return serviceRegionOptions.find(option => option.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
    }).filter(Boolean),
  )]);
  const regionOptions = useMemo(
    () => [...new Set([...serviceRegionOptions, ...serviceRegions])],
    [serviceRegions],
  );

  let submitLabel = provider ? "Save changes" : "Add pharmacy as discovered";
  if (pending) submitLabel = "Saving…";

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tradingName">Trading name</Label>
          <Input id="tradingName" name="tradingName" defaultValue={provider?.tradingName ?? defaultValues?.tradingName} required />
          <FieldError messages={state.fieldErrors?.tradingName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="legalName">Legal (registered) name</Label>
          <Input id="legalName" name="legalName" defaultValue={provider?.legalName} required />
          <FieldError messages={state.fieldErrors?.legalName} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="websiteDomain">Website domain</Label>
        <Input
          id="websiteDomain"
          name="websiteDomain"
          placeholder="example-pharmacy.co.uk"
          defaultValue={provider?.websiteDomain ?? defaultValues?.websiteDomain}
          required
        />
        <FieldError messages={state.fieldErrors?.websiteDomain} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="regulatorType">Regulator</Label>
          <select
            id="regulatorType"
            name="regulatorType"
            required
            defaultValue={provider?.regulatorType ?? regulatorTypeValues[0]}
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
          <Input id="regulatorReference" name="regulatorReference" defaultValue={provider?.regulatorReference} required />
          <FieldError messages={state.fieldErrors?.regulatorReference} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dispensingPartnerName">Dispensing partner (if different from trading name)</Label>
        <Input id="dispensingPartnerName" name="dispensingPartnerName" defaultValue={provider?.dispensingPartnerName ?? undefined} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="serviceRegions">Service regions</Label>
        <Select multiple value={serviceRegions} onValueChange={setServiceRegions} disabled={pending}>
          <SelectTrigger
            id="serviceRegions"
            className="h-auto min-h-8 w-full whitespace-normal"
            aria-invalid={!!state.fieldErrors?.serviceRegions?.length}
            aria-describedby="serviceRegions-help"
          >
            <SelectValue className="min-w-0">
              {serviceRegions.length ? serviceRegions.join(", ") : "Select service regions"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {regionOptions.map(region => <SelectItem key={region} value={region}>{region}</SelectItem>)}
          </SelectContent>
        </Select>
        <input type="hidden" name="serviceRegions" value={serviceRegions.join(", ")} />
        <p id="serviceRegions-help" className="text-xs text-muted-foreground">Select all regions this pharmacy serves.</p>
        <FieldError messages={state.fieldErrors?.serviceRegions} />
      </div>

      {!!state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {submitLabel}
      </Button>
      {!provider && (
        <p className="text-xs text-muted-foreground">
          New entries start as &ldquo;Discovered&rdquo;. Identity and ED-catalogue verification happen as separate review steps before publication.
        </p>
      )}
    </form>
  );
}
