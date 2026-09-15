import type { Metadata } from "next";
import { HeroSection } from "@/components/marketing/hero-section";
import { FeatureGridSection } from "@/components/marketing/feature-grid-section";
import { ComparisonSection } from "@/components/marketing/comparison-section";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { FlowSection } from "@/components/marketing/flow-section";

export const metadata: Metadata = { title: "UK ED pharmacy comparison — Platform preview", description: "Explore the planned UK erectile dysfunction pharmacy directory, treatment price comparisons and reviewed guides.", alternates: { canonical: "/" } };

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
