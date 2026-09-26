import { ContentSection, PointList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";
import { PharmacySuggestionForm } from "@/components/ed/public-forms";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suggest an ED pharmacy",
  description: "Suggest a UK online pharmacy offering ED treatment. Our team checks its registration and ED service before it can be listed.",
  alternates: { canonical: "/ed/pharmacies/submit" },
};

export default function SubmitPharmacyPage() {
  return (
    <PageShell
      title="Suggest a pharmacy"
      heading={<>Suggest a pharmacy <GradientText>for the directory.</GradientText></>}
      eyebrow="Pharmacies / Build the directory"
      description="Know a UK pharmacy offering online ED treatment that isn't listed? Tell us, and we'll check it the same way as every other pharmacy."
      crumbs={[{ label: "Home", href: "/" }, { label: "Pharmacies", href: "/ed/pharmacies" }]}
    >
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <PharmacySuggestionForm />
        <aside>
          <ContentSection id="what-happens" title="What happens next">
            <PointList columns={1} points={[
              "We check its GPhC or PSNI registration.",
              "We confirm it runs a genuine ED consultation service.",
              "If it passes, a staff member publishes it.",
              "Suggesting a pharmacy doesn't guarantee a listing, and pharmacies can't pay to be included.",
            ]} />
          </ContentSection>
        </aside>
      </div>
    </PageShell>
  );
}
