import { Building2, FileSpreadsheet, Landmark, Users } from "lucide-react";

import { getPublicDirectoryStats } from "@/actions/providers/public-providers";
import { CallToAction, ContentSection, InfoCardGrid, StepList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "How we find ED pharmacies",
  description: "The public registers and official data we use to find UK pharmacies offering ED treatment, and how duplicates and changes are handled before staff review.",
  alternates: { canonical: "/ed/pharmacies/discovery" },
};

const SOURCES = [
  { icon: Landmark, title: "GPhC register", body: "The General Pharmaceutical Council's public register of pharmacy premises in Great Britain." },
  { icon: FileSpreadsheet, title: "NHS data", body: "NHS organisation data (NHS ODS) and NHSBSA's list of distance-selling (online) pharmacy contractors." },
  { icon: Building2, title: "CQC and Companies House", body: "Care Quality Commission provider data and Companies House records, to confirm the business behind a website." },
  { icon: Users, title: "Your suggestions", body: "Anyone can suggest a pharmacy. Suggestions go through exactly the same checks." },
];

const STEPS = [
  { title: "Import candidates", body: "New and changed pharmacies are pulled from each source on a schedule our staff control." },
  { title: "Match duplicates", body: "Candidates are matched on hard identifiers like registration and company numbers, so one pharmacy isn't listed twice." },
  { title: "Find the website", body: "We confirm which website belongs to the registered pharmacy and whether it offers ED treatment." },
  { title: "Staff review", body: "Every candidate is promoted or rejected by a person, then goes through our verification checks before it can be published." },
];

export default async function DiscoveryPage() {
  const { found } = await getPublicDirectoryStats();

  return (
    <PageShell
      title="Automatic pharmacy discovery"
      heading={<>How we find pharmacies, <GradientText>then check them.</GradientText></>}
      eyebrow="Pharmacies / Build the directory"
      description={`We use public registers and official data to find UK pharmacies that may offer ED treatment. So far we've found ${found} to check. A person reviews every one.`}
      crumbs={[{ label: "Home", href: "/" }, { label: "Pharmacies", href: "/ed/pharmacies" }]}
    >
      <ContentSection id="sources" title="Where candidates come from">
        <InfoCardGrid items={SOURCES} columns={4} />
      </ContentSection>
      <ContentSection id="process" title="From candidate to listing">
        <StepList steps={STEPS} />
      </ContentSection>
      <CallToAction title="Know a pharmacy we've missed?" body="Suggest it and we'll put it through the same checks." href="/ed/pharmacies/submit" label="Suggest a pharmacy" />
    </PageShell>
  );
}
