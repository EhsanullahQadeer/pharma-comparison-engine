import { BookOpenCheck, FileClock, PenLine, UserCheck } from "lucide-react";

import { CallToAction, ContentSection, InfoCardGrid, PointList, StepList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editorial and clinical review policy",
  description: "How our ED guides are written, source-checked and clinically reviewed, how each guide shows which stage it has reached, and how to report a mistake.",
  alternates: { canonical: "/ed/trust/editorial-policy" },
};

const PRINCIPLES = [
  { icon: PenLine, title: "Every statement cited", body: "Each fact links to a numbered source, so you can check it yourself." },
  { icon: UserCheck, title: "A different, named reviewer", body: "A clinical reviewer who didn't write the guide approves it. Nobody can approve their own work." },
  { icon: BookOpenCheck, title: "Sources you can check", body: "We use the NHS, the MHRA, regulators and each medicine's official product information (SmPC)." },
  { icon: FileClock, title: "Dated and versioned", body: "Guides show the date their sources were checked, or their review date and revision number once reviewed." },
];

const STEPS = [
  { title: "Source check", body: "The guide is written only from official sources. Each statement is checked against the source it cites, and the guide shows the date of that check." },
  { title: "Published as source-checked", body: "The guide appears marked “Sourced · clinical review pending”. It never claims a review it hasn't had, and it's kept out of search results until reviewed." },
  { title: "Clinical review", body: "A named reviewer checks accuracy, safety wording and signposting. They approve it or return it with notes." },
  { title: "Reviewed and revised", body: "An approved guide shows its author, reviewer and review date. Any later edit goes back for review." },
];

export default function EditorialPolicyPage() {
  return (
    <PageShell
      title="Editorial and clinical review policy"
      heading={<>How our guides are written <GradientText>and reviewed.</GradientText></>}
      eyebrow="Trust / Our approach"
      description="Health information has to be accurate, sourced and checked. This is the process every ED guide goes through, and each guide shows which stage it has reached."
      crumbs={[{ label: "Home", href: "/" }]}
    >
      <InfoCardGrid items={PRINCIPLES} columns={4} />
      <ContentSection id="process" title="From sources to clinical review">
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
      <CallToAction title="Found an error in a guide?" body="Tell us what's wrong and where. The guide's author and reviewer will look at it." href="/ed/contact" label="Report a mistake" />
    </PageShell>
  );
}
