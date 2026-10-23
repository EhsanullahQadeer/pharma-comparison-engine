import { PharmacyCrumbs, ProfileHeader } from "@/components/ed/pharmacy-page/hero-blocks";
import { DiscountList, PricesBlock } from "@/components/ed/pharmacy-page/offer-blocks";
import { CorrectionPrompt, FaqList, FullCostChecklist, IndependenceNote, KeyFacts, RegistrationChecks } from "@/components/ed/pharmacy-page/trust-blocks";
import type { PharmacyPageModel } from "@/types/pharmacy-page";

// The pharmacy profile: one compact layout for every pharmacy (client decision 2026-10-23,
// replacing ten rotating layouts). Header card, then prices beside a side panel of facts and
// checks, then the FAQ. On phones it stacks in that order.
export function PharmacyLayout({ model }: { model: PharmacyPageModel }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PharmacyCrumbs name={model.provider.name} />
      <ProfileHeader model={model} className="mt-4" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0 space-y-8">
          <DiscountList model={model} />
          <PricesBlock model={model} />
        </div>
        <div className="space-y-4">
          <KeyFacts model={model} />
          <RegistrationChecks model={model} />
          <FullCostChecklist model={model} />
          <CorrectionPrompt model={model} />
          <IndependenceNote model={model} />
        </div>
      </div>
      <FaqList model={model} className="mt-10" />
    </div>
  );
}
