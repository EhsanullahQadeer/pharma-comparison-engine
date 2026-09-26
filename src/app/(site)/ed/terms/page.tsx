import { ContentSection, PointList } from "@/components/ed/content-blocks";
import { PageShell } from "@/components/ed/page-shell";
import Link from "@/components/Link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms for using this ED price comparison site, and how they differ from the terms of each pharmacy you buy from.",
  alternates: { canonical: "/ed/terms" },
};

export default function TermsPage() {
  return (
    <PageShell title="Terms of use" eyebrow="Trust / Policies" description="By using this site you agree to these terms. They're short, and written to be read." crumbs={[{ label: "Home", href: "/" }]}>
      <ContentSection id="service" title="What this site is">
        <PointList points={[
          "A free comparison of UK pharmacies offering erectile dysfunction treatment, with prices read from each pharmacy's own website.",
          "We don't sell medicines, run consultations or prescribe. We don't take orders or payments.",
          "Using the site is free, and you don't need an account.",
        ]} />
      </ContentSection>
      <ContentSection id="information" title="Using the information">
        <PointList points={[
          "Our guides are general information, not medical advice. Only a prescriber who has assessed you can decide whether a treatment is suitable.",
          "Prices can change after we check them. The price you pay is the one at the pharmacy's checkout.",
          "We check each pharmacy's registration, but a listing isn't an endorsement or a guarantee of its service.",
          "In an emergency, call 999. For urgent advice, call NHS 111.",
        ]} />
        <p className="mt-6 text-sm text-muted-foreground">More detail: <Link href="/ed/trust/disclaimer" className="underline underline-offset-4">information disclaimer</Link> and <Link href="/ed/trust/listing-disclaimer" className="underline underline-offset-4">listing disclaimer</Link>.</p>
      </ContentSection>
      <ContentSection id="pharmacy-terms" title="Buying from a pharmacy">
        <PointList points={[
          "When you continue to a pharmacy, you deal with that pharmacy directly, under its own terms and privacy policy.",
          "The consultation, prescribing decision, supply, delivery, refunds and complaints are the pharmacy's responsibility.",
          "If something goes wrong with an order, contact the pharmacy. You can also raise concerns with its regulator, such as the General Pharmaceutical Council.",
        ]} />
      </ContentSection>
      <ContentSection id="acceptable-use" title="Acceptable use">
        <PointList points={[
          "Don't send false, abusive or spam submissions through our forms.",
          "Don't try to disrupt the site, or collect its content automatically in a way that overloads it.",
          "You're welcome to link to any page.",
        ]} />
      </ContentSection>
      <ContentSection id="liability" title="Our responsibility">
        <PointList points={[
          "We work to keep information accurate and correct mistakes quickly, but we can't guarantee it's always complete or up to date.",
          "Nothing in these terms limits your rights under UK consumer law, or any liability that can't legally be limited.",
          "We may update these terms. The version on this page is the one that applies.",
        ]} />
        <p className="mt-6 text-sm text-muted-foreground">Spotted a mistake? <Link href="/ed/pharmacies/claim" className="underline underline-offset-4">Report a correction</Link> or <Link href="/ed/contact" className="underline underline-offset-4">contact us</Link>.</p>
      </ContentSection>
    </PageShell>
  );
}
