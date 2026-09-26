import { getPublicProviders } from "@/actions/providers/public-providers";
import { ContentSection, PointList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";
import { CorrectionRequestForm } from "@/components/ed/public-forms";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claim or correct a pharmacy listing",
  description: "Report an out-of-date price or detail on a pharmacy listing, or ask to manage your pharmacy's listing. Every request is reviewed by our team.",
  alternates: { canonical: "/ed/pharmacies/claim" },
};

export default async function ClaimPage(props: PageProps<"/ed/pharmacies/claim">) {
  const [{ pharmacy }, providers] = await Promise.all([props.searchParams, getPublicProviders()]);
  const options = providers.map((provider) => ({ value: provider.slug, label: provider.name }));
  const defaultPharmacy = typeof pharmacy === "string" && options.some((option) => option.value === pharmacy) ? pharmacy : undefined;

  return (
    <PageShell
      title="Claim or correct a listing"
      heading={<>Something out of date? <GradientText>Tell us.</GradientText></>}
      eyebrow="Pharmacies / For pharmacies"
      description="Visitors and pharmacies can report a wrong price or detail. Every request goes to our staff review queue and is checked against the pharmacy's own information."
      crumbs={[{ label: "Home", href: "/" }, { label: "Pharmacies", href: "/ed/pharmacies" }]}
    >
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <CorrectionRequestForm pharmacies={options} defaultPharmacy={defaultPharmacy} />
        <aside>
          <ContentSection id="for-pharmacies" title="Are you the pharmacy?">
            <PointList columns={1} points={[
              "Send your correction from an email address on your pharmacy's own domain so we can confirm who you are.",
              "Being listed is free and doesn't depend on any agreement with us.",
              "We'll never remove accurate information because we've been asked to.",
            ]} />
          </ContentSection>
        </aside>
      </div>
    </PageShell>
  );
}
