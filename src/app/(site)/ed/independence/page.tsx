import { Ban, Scale, Eye, HandCoins } from "lucide-react";

import { getLinkedProviders } from "@/actions/referrals/outbound-links";
import { CallToAction, ContentSection, InfoCardGrid, PointList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";
import { PartnerList, partnerCard } from "@/components/ed/partner-disclosure";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Independence and referral income",
  description: "Who pays us, which pharmacies we have a commercial relationship with, and why none of it changes how pharmacies are listed or ranked.",
  alternates: { canonical: "/ed/independence" },
};

const RANKED = { icon: Scale, title: "Ranked by price only", body: "The lowest verified price comes first, with a neutral tie-break. Nothing else moves a pharmacy up or down." };
const INCLUSION = { icon: Ban, title: "Inclusion isn't for sale", body: "Pharmacies are listed after our checks, free of charge. They can't pay to be listed, hidden or reordered." };
const DISCLOSED = { icon: Eye, title: "Always disclosed", body: "This page lists every pharmacy we earn from, and every link that could earn us money is labelled." };

export default async function IndependencePage() {
  const partners = await getLinkedProviders();

  return (
    <PageShell
      title="Independence and referral income"
      heading={<>Independent by design, <GradientText>and open about money.</GradientText></>}
      eyebrow="Trust / Our approach"
      description="A price comparison is only useful if nobody can pay to change it. These are the rules we hold ourselves to."
      crumbs={[{ label: "Home", href: "/" }]}
    >
      <InfoCardGrid items={[RANKED, INCLUSION, partnerCard(partners, HandCoins), DISCLOSED]} columns={4} />
      <ContentSection id="commitments" title="Our commitments">
        <PointList points={[
          "A pharmacy's commercial relationship with us never changes its prices or its position in the rankings.",
          "The one difference is the link: we link only to partner pharmacies. Every other pharmacy is still listed, priced and ranked in full.",
          "Offers with verified fees rank ahead of indicative ones, so an unknown fee can never make a price look cheaper than it is.",
          "Every link that could earn us money is labelled “Partner · we may earn commission” next to it.",
          "We never accept payment to remove accurate information or to hide a competitor.",
        ]} />
      </ContentSection>
      <PartnerList partners={partners} />
      <CallToAction title="See something that looks wrong?" body="If a listing or ranking doesn't follow these rules, tell us and we'll check it." href="/ed/contact" label="Contact us" />
    </PageShell>
  );
}
