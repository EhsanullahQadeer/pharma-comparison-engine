import { getPublicOffers } from "@/actions/offers/public-offers";
import { getPublicDirectoryStats } from "@/actions/providers/public-providers";
import { AboutSection } from "@/components/marketing/about-section";
import { ComparisonSection } from "@/components/marketing/comparison-section";
import { ContactSection } from "@/components/marketing/contact-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { FeatureGridSection } from "@/components/marketing/feature-grid-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { StatsBand } from "@/components/marketing/stats-band";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = { title: "UK ED pharmacy price comparison", description: "Compare sildenafil and tadalafil prices from registered UK pharmacies, with delivery and consultation fees included, plus sourced guides on treatment and safety.", alternates: { canonical: "/" } };

export default async function Home() {
  // Counts only: the homepage stays indexable, so no individual POM prices are shown here.
  const [{ published, found }, offers] = await Promise.all([getPublicDirectoryStats(), getPublicOffers()]);

  return (
    <>
      <HeroSection stats={{ published, livePrices: offers.length }} />
      <StatsBand found={found} published={published} />
      <FeatureGridSection />
      <ComparisonSection />
      <AboutSection />
      <TestimonialsSection />
      <ContactSection />
      <CtaSection />
    </>
  );
}
