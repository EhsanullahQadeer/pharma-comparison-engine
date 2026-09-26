import { ComparisonSection } from "@/components/marketing/comparison-section";
import { FeatureGridSection } from "@/components/marketing/feature-grid-section";
import { FlowSection } from "@/components/marketing/flow-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "UK ED pharmacy price comparison", description: "Compare sildenafil and tadalafil prices from registered UK pharmacies, with delivery and consultation fees included, plus sourced guides on treatment and safety.", alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
        <HeroSection />
        <FeatureGridSection />
        <ComparisonSection />
        <TestimonialsSection />
        <FlowSection />
    </>
  );
}
