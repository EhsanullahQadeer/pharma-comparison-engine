import { Repeat } from "lucide-react";

import { getPublicOffers } from "@/actions/offers/public-offers";
import { CallToAction, ContentSection, PointList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { OfferResults } from "@/components/ed/offer-results";
import { PageShell } from "@/components/ed/page-shell";
import { PublicEmptyState } from "@/components/ed/public-empty-state";
import { pomPricingRobots } from "@/lib/seo";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Repeat ED treatment costs — subscriptions and repeat orders",
  description: "How first-order offers differ from repeat prices, how subscription-style ED treatment plans are billed, and current repeat-purchase prices where pharmacies publish them.",
  alternates: { canonical: "/ed/prices/repeat-costs" },
  robots: pomPricingRobots,
};

export default async function RepeatCostsPage() {
  const recurring = (await getPublicOffers()).filter((offer) => offer.purchaseModel === "RECURRING");

  return (
    <PageShell
      title="Repeat purchase costs"
      heading={<>Repeat costs, <GradientText>not just the first order.</GradientText></>}
      eyebrow="Prices / Understand the total"
      description="The price you pay the second and third time can differ from an introductory offer. Here's what to check, and current subscription-style prices where pharmacies publish them."
      crumbs={[{ label: "Home", href: "/" }, { label: "Compare prices", href: "/ed/compare" }]}
    >
      <ContentSection id="what-to-check" title="What to check before you commit">
        <PointList points={[
          "Is the advertised price for the first order only? Look for the standard price that applies afterwards.",
          "For subscriptions: how often you're billed, how many tablets each delivery contains, and how to pause or cancel.",
          "Whether a consultation fee is charged once, yearly or on every order.",
          "Whether delivery is free on repeat orders or only above a minimum spend.",
        ]} />
      </ContentSection>
      <ContentSection id="subscription-prices" title="Current subscription-style prices">
        {recurring.length === 0 ? (
          <PublicEmptyState icon={Repeat} title="No subscription prices published yet" description="None of the pharmacies we list currently publish a recurring plan we've verified. One-off pack prices are on the comparison page." action={{ href: "/ed/compare", label: "Compare one-off prices" }} />
        ) : (
          <OfferResults offers={recurring} sort="tablet" now={new Date()} />
        )}
      </ContentSection>
      <CallToAction title="Compare the full cost of a pack" body="See every current price with delivery and consultation fees added in." href="/ed/compare" label="Compare prices" />
    </PageShell>
  );
}
