import { ArrowRight, BookOpen, PackageSearch, Pill } from "lucide-react";

import { getPublicOffers } from "@/actions/offers/public-offers";
import { GradientText } from "@/components/ed/gradient-text";
import { LiveSummary } from "@/components/ed/live-summary";
import { OfferResults } from "@/components/ed/offer-results";
import { PageShell } from "@/components/ed/page-shell";
import { PricingNotes } from "@/components/ed/pricing-notes";
import { PublicEmptyState } from "@/components/ed/public-empty-state";
import { VariantPriceCard } from "@/components/ed/variant-price-card";
import Link from "@/components/Link";
import type { Ingredient } from "@/generated/prisma/client";
import { ingredientLabels, ingredientSlugs } from "@/lib/catalogue-labels";
import { comparisonHref, summarizeVariants } from "@/lib/comparison";

export const ingredientPageCopy: Record<Ingredient, { description: string; other: Ingredient }> = {
  SILDENAFIL: {
    description: "Sildenafil prices, including branded Viagra, from registered UK pharmacies. Every strength and pack size, with delivery and consultation costs added in.",
    other: "TADALAFIL",
  },
  TADALAFIL: {
    description: "Tadalafil prices, including branded Cialis and daily-dose packs, from registered UK pharmacies. Every strength and pack size, with delivery and consultation costs added in.",
    other: "SILDENAFIL",
  },
};

const TOP_OFFERS = 5;

export async function IngredientPricesView({ ingredient }: { ingredient: Ingredient }) {
  const offers = (await getPublicOffers()).filter((offer) => offer.variant.ingredient === ingredient);
  const summaries = summarizeVariants(offers);
  const label = ingredientLabels[ingredient];
  const { description, other } = ingredientPageCopy[ingredient];
  const now = new Date();

  return (
    <PageShell
      title={`${label} prices`}
      heading={<>{label} prices, <GradientText>side by side.</GradientText></>}
      eyebrow="Prices / Compare costs"
      description={description}
      crumbs={[{ label: "Home", href: "/" }, { label: "Compare prices", href: "/ed/compare" }]}
      aside={<LiveSummary offers={offers} now={now} />}
    >
      {offers.length === 0 ? (
        <PublicEmptyState icon={PackageSearch} title={`${label} prices are being checked`} description="Verified prices will appear here once pharmacies and their prices have been checked." action={{ href: "/ed/pharmacies", label: "Browse pharmacies" }} />
      ) : (
        <>
          <section aria-labelledby="variants-heading" className="mt-12">
            <h2 id="variants-heading" className="text-2xl font-semibold">Choose a strength and pack</h2>
            <p className="mt-2 text-sm text-muted-foreground">Lowest total for each option. Pick one to compare every pharmacy&apos;s price for it.</p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {summaries.map((summary, index) => <VariantPriceCard key={summary.variant.id} summary={summary} index={index} />)}
            </ul>
          </section>
          <OfferResults offers={offers} sort="tablet" now={now} limit={TOP_OFFERS} />
          <Link href={comparisonHref({ ingredient })} className="group mt-6 inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">
            See all {offers.length} {label.toLowerCase()} prices<ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </>
      )}
      <section aria-labelledby="related-heading" className="mt-16">
        <h2 id="related-heading" className="text-2xl font-semibold">Keep exploring</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            { href: `/ed/prices/${ingredientSlugs[other]}`, icon: Pill, title: `${ingredientLabels[other]} prices`, body: `Compare every ${ingredientLabels[other].toLowerCase()} strength and pack.` },
            { href: `/ed/treatments/${ingredientSlugs[ingredient]}`, icon: BookOpen, title: `${label} explained`, body: "A plain-English introduction to discuss with a pharmacist or prescriber." },
          ].map(({ href, icon: Icon, title, body }) => (
            <Link key={href} href={href} className="group flex items-start gap-4 rounded-3xl border border-border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 transition-transform group-hover:scale-110"><Icon aria-hidden="true" className="size-5" /></span>
              <span><span className="block font-medium">{title}</span><span className="mt-1 block text-sm text-muted-foreground">{body}</span></span>
            </Link>
          ))}
        </div>
      </section>
      <PricingNotes />
    </PageShell>
  );
}
