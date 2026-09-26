import { Ban, Scale, Eye, HandCoins } from "lucide-react";

import { CallToAction, ContentSection, InfoCardGrid, PointList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Independence and referral income",
  description: "Who pays us (at launch, no pharmacy does), how listings and rankings are decided, and how any future commercial relationship will be disclosed.",
  alternates: { canonical: "/ed/independence" },
};

const RULES = [
  { icon: Scale, title: "Ranked by price only", body: "The lowest verified price comes first, with a neutral tie-break. Nothing else moves a pharmacy up or down." },
  { icon: Ban, title: "Inclusion isn't for sale", body: "Pharmacies are listed after our checks, free of charge. They can't pay to be listed, hidden or reordered." },
  { icon: HandCoins, title: "No referral income today", body: "At launch we have no referral, commission or advertising agreements with any pharmacy we list." },
  { icon: Eye, title: "Disclosed if that changes", body: "If we ever earn from a pharmacy, this page will say which ones and how, and it still won't affect ranking." },
];

export default function IndependencePage() {
  return (
    <PageShell
      title="Independence and referral income"
      heading={<>Independent by design, <GradientText>and open about money.</GradientText></>}
      eyebrow="Trust / Our approach"
      description="A price comparison is only useful if nobody can pay to change it. These are the rules we hold ourselves to."
      crumbs={[{ label: "Home", href: "/" }]}
    >
      <InfoCardGrid items={RULES} columns={4} />
      <ContentSection id="commitments" title="Our commitments">
        <PointList points={[
          "Changing a pharmacy's commercial relationship with us never changes its prices, position or presentation.",
          "Offers with verified fees rank ahead of indicative ones, so an unknown fee can never make a price look cheaper than it is.",
          "Any link that earns us money will be labelled as such next to the link.",
          "We never accept payment to remove accurate information or to hide a competitor.",
        ]} />
      </ContentSection>
      <CallToAction title="See something that looks wrong?" body="If a listing or ranking doesn't follow these rules, tell us and we'll check it." href="/ed/contact" label="Contact us" />
    </PageShell>
  );
}
