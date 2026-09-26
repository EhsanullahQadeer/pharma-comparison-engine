import { ContentSection, PointList } from "@/components/ed/content-blocks";
import { PageShell } from "@/components/ed/page-shell";
import Link from "@/components/Link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pharmacy listing disclaimer",
  description: "What being listed in our ED pharmacy directory means and doesn't mean, how complete the directory is, and how to correct a listing.",
  alternates: { canonical: "/ed/trust/listing-disclaimer" },
};

export default function ListingDisclaimerPage() {
  return (
    <PageShell title="Pharmacy listing disclaimer" eyebrow="Trust / Policies" description="What a listing tells you, what it doesn't, and how to get one corrected." crumbs={[{ label: "Home", href: "/" }]}>
      <ContentSection id="means" title="What a listing means">
        <PointList points={[
          "We checked the pharmacy's registration with the GPhC (or the PSNI in Northern Ireland) on the date shown.",
          "We confirmed it offers an ED consultation service online.",
          "Its prices come from its own public website and are dated.",
        ]} />
      </ContentSection>
      <ContentSection id="doesnt-mean" title="What a listing doesn't mean">
        <PointList points={[
          "It isn't an endorsement or recommendation.",
          "It doesn't mean we have a commercial or referral agreement with the pharmacy.",
          "It doesn't rate delivery, customer service or clinical care.",
          "Not being listed doesn't mean a pharmacy is unsafe. We may simply not have checked it yet.",
        ]} />
      </ContentSection>
      <ContentSection id="coverage" title="Coverage and accuracy" intro="The directory grows as we check more pharmacies, so it doesn't include every UK pharmacy offering ED treatment. Details can change between our checks.">
        <p className="mt-4 text-sm text-muted-foreground">
          Found something out of date? <Link href="/ed/pharmacies/claim" className="font-medium text-foreground underline underline-offset-4">Request a correction</Link> or <Link href="/ed/pharmacies/submit" className="font-medium text-foreground underline underline-offset-4">suggest a pharmacy</Link>.
        </p>
      </ContentSection>
    </PageShell>
  );
}
