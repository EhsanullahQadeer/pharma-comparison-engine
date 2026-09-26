import { BadgeCheck, Clock3, Scale, ShieldCheck } from "lucide-react";

import { getPublicOffers } from "@/actions/offers/public-offers";
import { getPublicProviders } from "@/actions/providers/public-providers";
import { CallToAction, ContentSection, InfoCardGrid, PointList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";
import { StatTile } from "@/components/ed/stat-tile";
import { siteConfig } from "@/lib/site-config";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `About ${siteConfig.brandName}`,
  description: "Who we are, what this UK ED price comparison does and doesn't do, and the principles behind it.",
  alternates: { canonical: "/ed/trust/about" },
};

const PRINCIPLES = [
  { icon: ShieldCheck, title: "Registered pharmacies only", body: "Every pharmacy is checked against its regulator's register before it's listed." },
  { icon: Scale, title: "Ranked by price alone", body: "Nobody can pay to be listed or to move up. The cheapest price comes first." },
  { icon: Clock3, title: "Dated and sourced", body: "Every price shows when it was checked, and every guide lists its sources." },
  { icon: BadgeCheck, title: "No medical advice", body: "We explain and compare. Prescribing decisions stay with a qualified prescriber." },
];

export default async function AboutPage() {
  const [providers, offers] = await Promise.all([getPublicProviders(), getPublicOffers()]);
  return (
    <PageShell
      title={`About ${siteConfig.brandName}`}
      heading={<>About {siteConfig.brandShortName}, <GradientText>and why it exists.</GradientText></>}
      eyebrow="Trust / About and support"
      description="Prices for erectile dysfunction treatment vary widely between UK online pharmacies, and delivery or consultation fees are easy to miss. We put them side by side, with the checks behind each listing."
      crumbs={[{ label: "Home", href: "/" }]}
    >
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <StatTile index={0} icon={ShieldCheck} label="Pharmacies listed" value={String(providers.length)} />
        <StatTile index={1} icon={Scale} label="Prices compared" value={String(offers.length)} />
      </div>
      <ContentSection id="what-we-do" title="What we do">
        <PointList points={[
          "Find UK pharmacies that offer sildenafil and tadalafil, and check their registration before listing them.",
          "Read each pharmacy's prices from its own website, adding delivery and consultation fees where they're shown.",
          "Compare the same medicine, strength and pack size, including the price per tablet.",
          "Publish plain-English guides on treatment, side effects and safety, each with its sources.",
        ]} />
      </ContentSection>
      <ContentSection id="what-we-dont" title="What we don't do">
        <PointList points={[
          "We don't sell medicines, prescribe or run consultations. You buy from the pharmacy.",
          "We don't take payment from pharmacies to be listed or ranked.",
          "We don't track you or sell your data.",
        ]} />
      </ContentSection>
      <ContentSection id="principles" title="Our principles">
        <InfoCardGrid items={PRINCIPLES} columns={4} />
      </ContentSection>
      <CallToAction title="Questions or corrections?" body="Tell us about a pharmacy we've missed, a price that's wrong, or anything else." href="/ed/contact" label="Contact us" />
    </PageShell>
  );
}
