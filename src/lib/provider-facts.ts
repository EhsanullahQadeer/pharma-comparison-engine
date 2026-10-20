import type { ProviderFactsFormValues } from "@/actions/providers/provider-facts-schema";
import type { ProviderFactsCheckedAt, ProviderFactsData } from "@/types/provider";

// Converts between the admin form's strings and the stored facts, and decides which "checked"
// dates a save moves on. Pure, so the rules are unit-tested.

const triStateToValue = { unknown: null, yes: true, no: false } as const;
function valueToTriState(value: boolean | null) {
  if (value === null) return "unknown";
  return value ? "yes" : "no";
}

export function factsFromForm(values: ProviderFactsFormValues): ProviderFactsData {
  return {
    trustpilotUrl: values.trustpilotUrl || null,
    trustpilotScoreTenths: values.trustpilotScore ? Math.round(Number(values.trustpilotScore) * 10) : null,
    trustpilotReviewCount: values.trustpilotReviewCount ? Number(values.trustpilotReviewCount) : null,
    inspectionOutcome: values.inspectionOutcome || null,
    inspectionDate: values.inspectionDate ? new Date(`${values.inspectionDate}T00:00:00Z`) : null,
    nextDayDelivery: triStateToValue[values.nextDayDelivery],
    discreetPackaging: triStateToValue[values.discreetPackaging],
    paymentMethods: [...new Set(values.paymentMethods)],
  };
}

export function formFromFacts(facts: ProviderFactsData): ProviderFactsFormValues {
  return {
    trustpilotUrl: facts.trustpilotUrl ?? "",
    trustpilotScore: facts.trustpilotScoreTenths === null ? "" : (facts.trustpilotScoreTenths / 10).toFixed(1),
    trustpilotReviewCount: facts.trustpilotReviewCount === null ? "" : String(facts.trustpilotReviewCount),
    inspectionOutcome: facts.inspectionOutcome ?? "",
    inspectionDate: facts.inspectionDate ? facts.inspectionDate.toISOString().slice(0, 10) : "",
    nextDayDelivery: valueToTriState(facts.nextDayDelivery),
    discreetPackaging: valueToTriState(facts.discreetPackaging),
    paymentMethods: facts.paymentMethods,
    recheckedToday: false,
  };
}

const groups: Record<keyof ProviderFactsCheckedAt, (keyof ProviderFactsData)[]> = {
  trustpilotCheckedAt: ["trustpilotUrl", "trustpilotScoreTenths", "trustpilotReviewCount"],
  inspectionCheckedAt: ["inspectionOutcome", "inspectionDate"],
  serviceFactsCheckedAt: ["nextDayDelivery", "discreetPackaging", "paymentMethods"],
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// A group's checked date moves to now when any of its facts changed, or when staff say they
// re-checked everything today — but only for a group that has something recorded.
export function checkedAtUpdates(previous: ProviderFactsData, next: ProviderFactsData, recheckedToday: boolean, now: Date): Partial<ProviderFactsCheckedAt> {
  const updates: Partial<ProviderFactsCheckedAt> = {};
  for (const [stamp, fields] of Object.entries(groups) as [keyof ProviderFactsCheckedAt, (keyof ProviderFactsData)[]][]) {
    const changed = fields.some((field) => !same(previous[field], next[field]));
    const recorded = fields.some((field) => next[field] !== null && !(Array.isArray(next[field]) && next[field].length === 0));
    if (changed || (recheckedToday && recorded)) updates[stamp] = recorded ? now : null;
  }
  return updates;
}
