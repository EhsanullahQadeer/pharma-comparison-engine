import { BookOpenCheck, FileClock, PenLine, UserCheck } from "lucide-react";

import { CallToAction, ContentSection, InfoCardGrid, PointList, StepList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editorial and clinical review policy",
  description: "How our ED guides are written, sourced and clinically reviewed before publication, how revisions are handled and how to report a mistake.",
  alternates: { canonical: "/ed/trust/editorial-policy" },
};

const PRINCIPLES = [
  { icon: PenLine, title: "A named author", body: "Every guide shows who wrote it." },
  { icon: UserCheck, title: "A different, named reviewer", body: "A clinical reviewer who didn't write the guide checks it before it's published. Nobody can approve their own work." },
  { icon: BookOpenCheck, title: "Sources you can check", body: "Every guide lists its sources, favouring the NHS, NICE, the MHRA and official medicine information." },
  { icon: FileClock, title: "Dated and versioned", body: "Guides show their review date and revision number. Any change to a published guide sends it back for review." },
];

const STEPS = [
  { title: "Draft", body: "The author writes the guide from its sources, with a summary and key facts, and lists every source used." },
  { title: "Clinical review", body: "A named reviewer checks accuracy against the sources, safety wording and signposting. They approve it or return it with notes." },
  { title: "Publication", body: "Only an approved guide appears on the site, showing the author, reviewer and review date." },
  { title: "Revision", body: "Any edit creates a new revision that is taken off the site until it has been reviewed again." },
];

export default function EditorialPolicyPage() {
  return (
    <PageShell
      title="Editorial and clinical review policy"
      heading={<>How our guides are written <GradientText>and reviewed.</GradientText></>}
      eyebrow="Trust / Our approach"
      description="Health information has to be accurate, sourced and checked. This is the process every ED guide goes through before you can read it here."
      crumbs={[{ label: "Home", href: "/" }]}
    >
      <InfoCardGrid items={PRINCIPLES} columns={4} />
      <ContentSection id="process" title="From draft to published">
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
