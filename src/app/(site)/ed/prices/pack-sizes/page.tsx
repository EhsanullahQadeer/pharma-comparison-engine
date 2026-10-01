import { PackageSearch } from "lucide-react";

import { getPublicOffers } from "@/actions/offers/public-offers";
import { CallToAction, ContentSection, PointList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";
import { PublicEmptyState } from "@/components/ed/public-empty-state";
import Link from "@/components/Link";
import { comparisonHref, summarizeVariants, variantProductName, variantTypeSlug } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { revealClass, revealStyle } from "@/lib/motion";
import { pomPricingRobots } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { VariantPriceSummary } from "@/types/comparison";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "ED pack-size comparison — price per tablet",
  description: "Compare the price per tablet of different pack sizes for the same ED medicine and strength, using current prices from checked UK pharmacies.",
  alternates: { canonical: "/ed/prices/pack-sizes" },
  robots: pomPricingRobots,
};

// Same product + strength, different pack sizes — the only fair "bigger pack is cheaper"
// comparison. A branded pack and a generic one are different products, never rows of one card.
function groupByStrength(summaries: VariantPriceSummary[]) {
  const groups = new Map<string, VariantPriceSummary[]>();
  for (const summary of summaries) {
    const key = `${variantProductName(summary.variant)}-${summary.variant.strengthMg}`;
    groups.set(key, [...(groups.get(key) ?? []), summary]);
  }
  return [...groups.values()].map((packs) => ({ packs: packs.sort((a, b) => a.variant.packQuantity - b.variant.packQuantity), cheapest: Math.min(...packs.map((pack) => pack.lowestPerTabletPence)) }));
}

export default async function PackSizesPage() {
  const groups = groupByStrength(summarizeVariants(await getPublicOffers()));

  return (
    <PageShell
      title="Pack-size comparison"
      heading={<>Pack sizes, <GradientText>price per tablet.</GradientText></>}
      eyebrow="Prices / Understand the total"
      description="A bigger pack often costs less per tablet but more up front. Here's the lowest current price per tablet for each pack size of the same medicine and strength."
      crumbs={[{ label: "Home", href: "/" }, { label: "Compare prices", href: "/ed/compare" }]}
    >
      {groups.length === 0 ? (
        <PublicEmptyState icon={PackageSearch} title="Prices are being checked" description="Pack-size comparisons appear once verified prices are published." action={{ href: "/ed/compare", label: "Compare prices" }} />
      ) : (
        <ul className="mt-10 grid gap-5 lg:grid-cols-2">
          {groups.map(({ packs, cheapest }, index) => {
            const heading = `${variantProductName(packs[0].variant)} ${packs[0].variant.strengthMg}mg`;
            return (
              <li key={heading} className={cn("rounded-3xl border border-border bg-card p-6 shadow-(--shadow)", revealClass)} style={revealStyle(index)}>
                <h2 className="text-xl font-semibold">{heading}</h2>
                <ul className="mt-4 divide-y divide-border">
                  {packs.map((pack) => (
                    <li key={pack.variant.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">{pack.variant.packQuantity} tablets</p>
                        <p className="text-xs text-muted-foreground">From {formatPence(pack.lowestTotalPence)} · {pack.offerCount} pharmac{pack.offerCount === 1 ? "y" : "ies"}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("rounded-full px-3 py-1 text-sm font-semibold tabular-nums", pack.lowestPerTabletPence === cheapest && packs.length > 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
                          {formatPence(pack.lowestPerTabletPence)} / tablet
                        </span>
                        <Link href={comparisonHref({ ingredient: pack.variant.ingredient, productType: variantTypeSlug(pack.variant), strengthMg: pack.variant.strengthMg, packQuantity: pack.variant.packQuantity })} className="text-sm underline underline-offset-4 hover:text-muted-foreground">Compare</Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
      <ContentSection id="things-to-weigh" title="Things to weigh up">
        <PointList points={[
          "A larger pack is a bigger upfront cost, and medicines have expiry dates. Check the date when yours arrives.",
          "Some pharmacies charge a consultation fee per order, which spreads further across a larger pack.",
          "Your prescriber decides which strength and how many tablets are appropriate. A cheaper pack isn't a reason to change either.",
        ]} />
      </ContentSection>
      <CallToAction title="Work out your own numbers" body="Use the pack-cost calculator to compare two packs, including delivery and consultation fees." href="/ed/tools/pack-cost" label="Open the calculator" />
    </PageShell>
  );
}
