import { SiteHeader } from "@/components/marketing/site-header";
import { HeroSection } from "@/components/marketing/hero-section";
import { FeatureGridSection } from "@/components/marketing/feature-grid-section";
import { ComparisonSection } from "@/components/marketing/comparison-section";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { FlowSection } from "@/components/marketing/flow-section";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <FeatureGridSection />
        <ComparisonSection />
        <TestimonialsSection />
        <FlowSection />
      </main>
      <SiteFooter />
    </div>
  );
}
