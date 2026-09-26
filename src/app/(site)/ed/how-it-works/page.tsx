import { BadgeCheck, Calculator, ExternalLink, Search } from "lucide-react";

import { CallToAction, ContentSection, InfoCardGrid, PointList, StepList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How ED price comparison works",
  description: "How we find UK pharmacies offering ED treatment, check their registration, collect their prices and show the full cost, and what happens when you continue to a pharmacy.",
  alternates: { canonical: "/ed/how-it-works" },
};

const STEPS = [
  { title: "We find pharmacies", body: "Pharmacies come from public registers and official NHS and company data, plus suggestions from visitors. Nothing is listed automatically." },
  { title: "We check them before listing", body: "Staff confirm each pharmacy's regulator registration and that it runs a genuine ED consultation service. Only then is it published." },
  { title: "We collect prices from their own websites", body: "Prices are read from each pharmacy's public product pages, matched to an exact medicine, strength and pack size, and dated. A staff member publishes each price." },
  { title: "You compare the full cost", body: "We add known delivery and consultation charges to show a total and a price per tablet, and rank by price alone." },
  { title: "You continue to the pharmacy", body: "The consultation, prescribing decision and purchase all happen on the pharmacy's own website, under its own terms." },
];

const CARDS = [
  { icon: Search, title: "Like for like", body: "Offers are matched to an exact ingredient, strength and pack size, so you compare the same thing." },
  { icon: Calculator, title: "The whole cost", body: "Delivery and consultation fees are added in. If a fee isn't shown on the pharmacy's page, we say so rather than assume it's free." },
  { icon: BadgeCheck, title: "Evidence, not scores", body: "Each pharmacy shows its registration number and what we checked, with dates, rather than an invented safety score." },
  { icon: ExternalLink, title: "No checkout here", body: "We never sell medicine or collect health information. You deal directly with the pharmacy." },
];

export default function HowItWorksPage() {
  return (
    <PageShell
      title="How it works"
      heading={<>How ED price comparison <GradientText>works here.</GradientText></>}
      eyebrow="Trust / Our approach"
      description="From finding a pharmacy to the moment you leave for its website: what we do, what we check, and what stays with the pharmacy."
      crumbs={[{ label: "Home", href: "/" }]}
    >
      <InfoCardGrid items={CARDS} columns={4} />
      <ContentSection id="steps" title="Five steps, start to finish">
        <StepList steps={STEPS} />
      </ContentSection>
      <ContentSection id="limits" title="What we don't do">
        <PointList points={[
          "We don't give medical advice or decide whether a treatment suits you. The pharmacy's prescriber does that.",
          "We don't sell medicines, take payments or store health information.",
          "We don't guarantee a price. Always confirm the final amount at the pharmacy's checkout.",
          "We don't rank pharmacies by anything other than price. Freshness and stock only decide whether a price is ranked.",
        ]} />
      </ContentSection>
      <CallToAction title="Ready to compare?" body="See current sildenafil and tadalafil prices from checked pharmacies, with fees included." href="/ed/compare" label="Compare prices" />
    </PageShell>
  );
}
