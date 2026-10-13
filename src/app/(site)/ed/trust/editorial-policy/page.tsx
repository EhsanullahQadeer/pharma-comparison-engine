import { BookOpenCheck, FileClock, PenLine, ShieldCheck } from "lucide-react";

import { CallToAction, ContentSection, InfoCardGrid, PointList, StepList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editorial and sources policy",
  description: "How our ED guides are written from trusted medical sources, how each statement is checked against the source it cites, and how to report a mistake.",
  alternates: { canonical: "/ed/trust/editorial-policy" },
};

const PRINCIPLES = [
  { icon: PenLine, title: "Every statement cited", body: "Each fact links to a numbered source, so you can check it yourself." },
  { icon: ShieldCheck, title: "Trusted sources only", body: "A guide can only cite the health service, regulators, international health bodies, official product information and peer-reviewed research." },
  { icon: BookOpenCheck, title: "Sources you can check", body: "We use the NHS, NICE, the MHRA, the WHO, UK regulators and each medicine's official product information (SmPC)." },
  { icon: FileClock, title: "Dated and versioned", body: "Every guide shows the date it was last checked against its sources." },
];

const STEPS = [
  { title: "Source check", body: "The guide is written only from official sources. Each statement is checked against the source it cites, and the guide shows the date of that check." },
  { title: "Published with its sources", body: "The guide appears with its numbered list of sources. It doesn't claim a review by a clinician, because our guides are checked against their sources rather than clinically reviewed." },
  { title: "Kept up to date", body: "When a guide is edited, its sources are checked again and the date shown on the guide changes." },
];

export default function EditorialPolicyPage() {
  return (
    <PageShell
      title="Editorial and sources policy"
      heading={<>How our guides are written <GradientText>and checked.</GradientText></>}
      eyebrow="Trust / Our approach"
      description="Health information has to be accurate, sourced and checked. This is the process every ED guide goes through."
      crumbs={[{ label: "Home", href: "/" }]}
    >
      <InfoCardGrid items={PRINCIPLES} columns={4} />
      <ContentSection id="process" title="From sources to publication">
        <StepList steps={STEPS} />
      </ContentSection>
      <ContentSection id="boundaries" title="What our guides will and won't do">
        <PointList points={[
          "Explain conditions, treatments and consultations in plain English.",
          "Compare medicines only as general information, never as a personal recommendation.",
          "Never suggest a dose, a change of dose or a way around a prescriber's assessment.",
          "Always signpost urgent symptoms to 999, A&E or NHS 111.",
          "Never promote a particular prescription medicine or pharmacy.",
          "Keep commercial relationships out of editorial decisions (see our independence policy).",
        ]} />
      </ContentSection>
      <CallToAction title="Found an error in a guide?" body="Tell us what's wrong and where. Our team will check it against the sources." href="/ed/contact" label="Report a mistake" />
    </PageShell>
  );
}
