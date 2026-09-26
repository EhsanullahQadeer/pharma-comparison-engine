import { Building2, Clock3, Database, Globe } from "lucide-react";

import { ContentSection, InfoCardGrid, PointList } from "@/components/ed/content-blocks";
import { PageShell } from "@/components/ed/page-shell";
import Link from "@/components/Link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Listing and price data transparency",
  description: "Where our pharmacy and price data comes from, how often it's checked, how missing or out-of-date information is shown, and how to request a correction.",
  alternates: { canonical: "/ed/trust/data-transparency" },
};

const SOURCES = [
  { icon: Building2, title: "Regulator registers", body: "Pharmacy registration details come from the public GPhC register (and PSNI for Northern Ireland). We show the registration number and link to the register so you can check it yourself." },
  { icon: Database, title: "NHS and company data", body: "Candidate pharmacies are found using NHS organisation data (NHS ODS and NHSBSA), CQC data and Companies House. Most of this is published under the Open Government Licence." },
  { icon: Globe, title: "Pharmacies' own websites", body: "Prices, delivery charges and stock come from each pharmacy's public product pages. We follow each site's published crawling rules, and some sites are checked by hand." },
  { icon: Clock3, title: "Dated checks", body: "Every price shows when it was last checked. Prices over 24 hours old aren't ranked, and prices over 48 hours old aren't shown." },
];

export default function DataTransparencyPage() {
  return (
    <PageShell title="Data transparency" eyebrow="Trust / Policies" description="Where every piece of information on this site comes from, and how we show what we don't know." crumbs={[{ label: "Home", href: "/" }]}>
      <InfoCardGrid items={SOURCES} columns={2} />
      <ContentSection id="unknowns" title="How we show missing or uncertain information">
        <PointList points={[
          "A fee that isn't shown on a pharmacy's page is labelled “Not listed”, never “Free”.",
          "Totals that include unverified fees are labelled indicative and ranked after verified totals.",
          "Stock is shown only when the pharmacy's page states it.",
          "Staff publish each price. Nothing collected automatically goes live on its own.",
        ]} />
      </ContentSection>
      <ContentSection id="corrections" title="Corrections" intro="Pharmacies and visitors can ask us to correct any listing. Requests go to a staff review queue, and we update or remove information that turns out to be wrong.">
        <p className="mt-4 text-sm">
          <Link href="/ed/pharmacies/claim" className="font-medium underline underline-offset-4">Request a correction</Link>
          <span className="text-muted-foreground"> · </span>
          <Link href="/ed/prices/data" className="font-medium underline underline-offset-4">How prices are collected</Link>
        </p>
      </ContentSection>
    </PageShell>
  );
}
