import { ContentSection, PointList } from "@/components/ed/content-blocks";
import { PageShell } from "@/components/ed/page-shell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ED information disclaimer",
  description: "The limits of the educational and price information on this site, and the role of pharmacists, prescribers and your GP.",
  alternates: { canonical: "/ed/trust/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <PageShell title="Information disclaimer" eyebrow="Trust / Policies" description="Please read this before relying on anything on this site." crumbs={[{ label: "Home", href: "/" }]}>
      <ContentSection id="not-advice" title="This isn't medical advice">
        <PointList points={[
          "Our guides are general information. They can't take account of your health, other conditions or other medicines.",
          "Only a pharmacist, prescriber or doctor who has assessed you can decide whether an ED treatment is suitable for you.",
          "Erection problems can be an early sign of other health conditions, such as heart disease. It's worth speaking to your GP even if you buy treatment privately.",
          "In an emergency, call 999. For urgent advice, call NHS 111.",
        ]} />
      </ContentSection>
      <ContentSection id="prices" title="Prices and availability">
        <PointList points={[
          "Prices are read from pharmacies' own websites at the time shown and can change at any time.",
          "The amount you pay is the amount at the pharmacy's checkout. Confirm it there before buying.",
          "Where a fee isn't shown on the pharmacy's page, our total is labelled indicative.",
          "Showing a price isn't a recommendation to buy that medicine or use that pharmacy.",
        ]} />
      </ContentSection>
      <ContentSection id="pharmacies" title="Pharmacies we list">
        <PointList points={[
          "The consultation, prescribing decision, supply and delivery are the pharmacy's responsibility, under its own terms.",
          "Our checks are a snapshot from the dates shown. They don't guarantee a pharmacy's service quality.",
        ]} />
      </ContentSection>
    </PageShell>
  );
}
