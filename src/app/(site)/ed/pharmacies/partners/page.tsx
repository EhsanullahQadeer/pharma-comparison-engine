import { Ban, Handshake, Scale } from "lucide-react";

import { CallToAction, ContentSection, InfoCardGrid, PointList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ED pharmacy partnerships",
  description: "Information for pharmacies: listing is free, rankings are by price only, and how any future referral or price-feed arrangement would work and be disclosed.",
  alternates: { canonical: "/ed/pharmacies/partners" },
};

const CARDS = [
  { icon: Ban, title: "Listing is free", body: "Pharmacies are listed after our checks, at no cost, and can't pay to be included." },
  { icon: Scale, title: "Ranking can't be bought", body: "Prices are ranked by price alone. A commercial relationship never changes position or presentation." },
  { icon: Handshake, title: "No partners yet", body: "We have no referral or commission agreements today. Any future agreement will be published on our independence page." },
];

export default function PartnersPage() {
  return (
    <PageShell
      title="Pharmacy partnerships"
      heading={<>For pharmacies: <GradientText>how listing works.</GradientText></>}
      eyebrow="Pharmacies / For pharmacies"
      description="Whether or not you ever work with us commercially, your pharmacy is listed and ranked on the same terms as everyone else."
      crumbs={[{ label: "Home", href: "/" }, { label: "Pharmacies", href: "/ed/pharmacies" }]}
    >
      <InfoCardGrid items={CARDS} />
      <ContentSection id="accuracy" title="Helping us keep your prices accurate">
        <PointList points={[
          "Publishing clear, structured product data (price, pack size, delivery charge) on your pages helps us match and read them correctly.",
          "If a price or detail is wrong, request a correction. It goes straight to our review queue.",
          "If you'd like to supply a price feed in future, get in touch. Feeds would still go through the same checks and freshness rules.",
        ]} />
      </ContentSection>
      <CallToAction title="Talk to us" body={"Choose “I work for a pharmacy” on the contact form and we'll reply by email."} href="/ed/contact" label="Contact the team" />
    </PageShell>
  );
}
