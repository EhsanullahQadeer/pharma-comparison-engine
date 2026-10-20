"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

import { updateProviderFacts } from "@/actions/providers/provider-facts";
import { providerFactsSchema, type ProviderFactsFormValues } from "@/actions/providers/provider-facts-schema";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { Checkbox } from "@/components/common/checkbox";
import FORM, { FormFeilds } from "@/components/common/form";
import InputField from "@/components/common/input";
import { useRouter } from "@/hooks/useRouter";
import { inspectionOutcomeLabels, inspectionOutcomeValues, paymentMethodLabels, paymentMethodValues } from "@/lib/provider-labels";

import type { FieldValues } from "react-hook-form";

const triStateOptions = [{ value: "unknown", label: "Not recorded" }, { value: "yes", label: "Yes" }, { value: "no", label: "No" }];
const inspectionOptions = [{ value: "", label: "Not recorded" }, ...inspectionOutcomeValues.map((value) => ({ value, label: inspectionOutcomeLabels[value] }))];
const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function Checked({ at }: { at: Date | null }) {
  return <p className="text-xs text-muted-foreground">{at ? `Last checked ${dateFormatter.format(at)}` : "Not checked yet"}</p>;
}

// Facts shoppers see on the price grid and can filter by. Record only what the pharmacy's own site
// or the public register shows; leave the rest "Not recorded" (shown as unknown, never as "no").
export function ProviderFactsCard({ providerId, defaultValues, checkedAt, canEdit, scoresShown }: {
  providerId: string;
  defaultValues: ProviderFactsFormValues;
  checkedAt: { trustpilot: Date | null; inspection: Date | null; service: Date | null };
  canEdit: boolean;
  scoresShown: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<{ pending: boolean; error?: string; saved?: boolean }>({ pending: false });

  const handleSubmit = useCallback(async (values: FieldValues) => {
    setState({ pending: true });
    const result = await updateProviderFacts(providerId, values as ProviderFactsFormValues);
    setState({ pending: false, error: result.error, saved: !result.error });
    if (!result.error) router.refresh();
  }, [providerId, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shopper-facing facts</CardTitle>
      </CardHeader>
      <CardContent>
        <FORM schema={providerFactsSchema} defaultValues={defaultValues} onSubmit={handleSubmit}>
          <fieldset disabled={!canEdit || state.pending} className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Trustpilot</h3>
              <FormFeilds fieldProps={{ name: "trustpilotUrl" }} label={{ text: "Trustpilot page" }}>
                {(field) => <InputField type="text" bare {...field} value={field.value ?? ""} placeholder="https://uk.trustpilot.com/review/example.co.uk" />}
              </FormFeilds>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormFeilds fieldProps={{ name: "trustpilotScore" }} label={{ text: "Score" }}>
                  {(field) => <InputField type="text" bare {...field} value={field.value ?? ""} inputMode="decimal" placeholder="4.8" />}
                </FormFeilds>
                <FormFeilds fieldProps={{ name: "trustpilotReviewCount" }} label={{ text: "Number of reviews" }}>
                  {(field) => <InputField type="text" bare {...field} value={field.value ?? ""} inputMode="numeric" />}
                </FormFeilds>
              </div>
              <p className="text-xs text-muted-foreground">{scoresShown ? "Scores are shown on the public site." : "Only the link is shown publicly until Trustpilot's terms are checked; the score is kept for later."}</p>
              <Checked at={checkedAt.trustpilot} />
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">GPhC inspection</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormFeilds fieldProps={{ name: "inspectionOutcome" }} label={{ text: "Outcome" }}>
                  {(field) => <InputField type="select" bare id={field.id} name={field.name} value={field.value ?? ""} onChange={field.onChange} options={inspectionOptions} />}
                </FormFeilds>
                <FormFeilds fieldProps={{ name: "inspectionDate" }} label={{ text: "Inspection date" }}>
                  {(field) => <InputField type="text" bare {...field} value={field.value ?? ""} placeholder="2025-03-31" />}
                </FormFeilds>
              </div>
              <Checked at={checkedAt.inspection} />
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Delivery and payment</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormFeilds fieldProps={{ name: "nextDayDelivery" }} label={{ text: "Next-day delivery" }}>
                  {(field) => <InputField type="select" bare id={field.id} name={field.name} value={field.value ?? "unknown"} onChange={field.onChange} options={triStateOptions} />}
                </FormFeilds>
                <FormFeilds fieldProps={{ name: "discreetPackaging" }} label={{ text: "Discreet packaging stated" }}>
                  {(field) => <InputField type="select" bare id={field.id} name={field.name} value={field.value ?? "unknown"} onChange={field.onChange} options={triStateOptions} />}
                </FormFeilds>
              </div>
              <FormFeilds fieldProps={{ name: "paymentMethods" }} label={{ text: "Payment methods" }}>
                {(field) => {
                  const selected: string[] = field.value ?? [];
                  return (
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      {paymentMethodValues.map((method) => (
                        <label key={method} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={selected.includes(method)} onCheckedChange={(checked) => field.onChange(checked ? [...selected, method] : selected.filter((value) => value !== method))} />
                          {paymentMethodLabels[method]}
                        </label>
                      ))}
                    </div>
                  );
                }}
              </FormFeilds>
              <Checked at={checkedAt.service} />
            </div>
            <FormFeilds fieldProps={{ name: "recheckedToday" }}>
              {(field) => (
                <label className="flex items-center gap-2 border-t border-border pt-4 text-sm">
                  <Checkbox checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                  I&apos;ve re-checked the recorded facts today (moves their &ldquo;last checked&rdquo; dates on)
                </label>
              )}
            </FormFeilds>
          </fieldset>
          {canEdit ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
              {state.saved ? <p role="status" className="text-sm text-muted-foreground">Saved.</p> : null}
              <Button type="submit" disabled={state.pending}>
                {state.pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                Save facts
              </Button>
            </div>
          ) : <p className="text-xs text-muted-foreground">Only catalogue editors and administrators can change these.</p>}
        </FORM>
      </CardContent>
    </Card>
  );
}
