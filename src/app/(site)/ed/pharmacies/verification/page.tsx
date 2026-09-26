import { BadgeCheck, Search, ShieldCheck, Stethoscope } from "lucide-react";

import { getPublicDirectoryStats } from "@/actions/providers/public-providers";
import { CallToAction, ContentSection, PointList, StepList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";
import { StatTile } from "@/components/ed/stat-tile";
import Link from "@/components/Link";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "How we verify ED pharmacies",
  description: "The identity, registration and ED-service checks every pharmacy passes before it's listed, and the limits of what a listing tells you.",
  alternates: { canonical: "/ed/pharmacies/verification" },
};

const STEPS = [
  { title: "Found", body: "The pharmacy is found through public registers, NHS data or a visitor's suggestion. Nothing about it is confirmed yet." },
  { title: "Identity verified", body: "Its legal and trading names and its website are matched against its GPhC (or PSNI) registration." },
  { title: "ED service verified", body: "We confirm it runs a genuine online ED consultation, not just a product page, and match its products to our catalogue." },
  { title: "Published", body: "A staff member approves the listing. The evidence we checked is shown on its profile with dates." },
];

export default async function VerificationPage() {
  const { published, found } = await getPublicDirectoryStats();

  return (
    <PageShell
      title="Pharmacy verification"
      heading={<>How a pharmacy <GradientText>earns its listing.</GradientText></>}
      eyebrow="Pharmacies / Find a pharmacy"
      description="No pharmacy is listed automatically. Each one passes the same staff checks, and a listing only ever moves forward through a deliberate staff decision."
      crumbs={[{ label: "Home", href: "/" }, { label: "Pharmacies", href: "/ed/pharmacies" }]}
    >
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile index={0} icon={Search} label="Pharmacies found so far" value={String(found)} />
        <StatTile index={1} icon={BadgeCheck} label="Checked and listed" value={String(published)} />
        <StatTile index={2} icon={ShieldCheck} label="Registration checked" value="Every listing" hint="GPhC or PSNI" />
        <StatTile index={3} icon={Stethoscope} label="ED service checked" value="Every listing" />
      </div>
      <ContentSection id="stages" title="The four stages">
        <StepList steps={STEPS} />
      </ContentSection>
      <ContentSection id="limits" title="What verification can't tell you">
        <PointList points={[
          "It's a snapshot from the dates on the profile, not a live feed from the regulator.",
          "It doesn't rate delivery speed, customer service or clinical care.",
          "A pharmacy can be temporarily withdrawn from the directory if its details need re-checking.",
        ]} />
        <p className="mt-5 text-sm text-muted-foreground">
          More detail: <Link href="/ed/trust/pharmacy-evidence" className="font-medium text-foreground underline underline-offset-4">pharmacy evidence and checks</Link>.
        </p>
      </ContentSection>
      <CallToAction title="Browse checked pharmacies" body="Every pharmacy in the directory has passed these checks." href="/ed/pharmacies" label="Open the directory" />
    </PageShell>
  );
}
