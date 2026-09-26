import { Clock3, ListChecks, RefreshCw, Store } from "lucide-react";

import { getPublicOffers } from "@/actions/offers/public-offers";
import { CallToAction, ContentSection, PointList, StepList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";
import { StatTile } from "@/components/ed/stat-tile";
import { formatCheckedAgo } from "@/lib/comparison";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Where our ED prices come from and how often they're checked",
  description: "How prices are collected from pharmacies' own websites, matched to the exact medicine and pack, checked by staff, refreshed on a schedule and labelled when they may be out of date.",
  alternates: { canonical: "/ed/prices/data" },
};

const STEPS = [
  { title: "Match the exact product", body: "Each pharmacy product page is matched to a single medicine, strength and pack size in our catalogue by staff, so like is compared with like." },
  { title: "Read the price from the pharmacy's page", body: "We read the price and any stated delivery charge from the pharmacy's own public page, following the site's published crawling rules. Pages behind a security check are checked by hand." },
  { title: "Staff publish it", body: "A collected price stays hidden until a staff member publishes it. Every change is kept in a price history." },
  { title: "Refresh on a schedule", body: "Each product page is re-checked daily, weekly or monthly, depending on how often that pharmacy changes its prices." },
];

export default async function PriceDataPage() {
  const offers = await getPublicOffers();
  const now = new Date();
  const fresh = offers.filter((offer) => offer.freshness === "fresh").length;
  const latest = offers.length > 0 ? new Date(Math.max(...offers.map((offer) => offer.checkedAt.getTime()))) : null;

  return (
    <PageShell
      title="Price sources and updates"
      heading={<>Where our prices come from, <GradientText>and how fresh they are.</GradientText></>}
      eyebrow="Prices / Understand the total"
      description="Every price on this site is read from a pharmacy's own website, matched to an exact product, published by a person, and dated."
      crumbs={[{ label: "Home", href: "/" }, { label: "Compare prices", href: "/ed/compare" }]}
    >
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile index={0} icon={ListChecks} label="Prices shown now" value={String(offers.length)} />
        <StatTile index={1} icon={Clock3} label="Checked in last 24h" value={String(fresh)} hint="These are ranked" />
        <StatTile index={2} icon={Store} label="Pharmacies with prices" value={String(new Set(offers.map((offer) => offer.providerId)).size)} />
        <StatTile index={3} icon={RefreshCw} label="Latest check" value={latest ? formatCheckedAgo(latest, now) : "—"} />
      </div>
      <ContentSection id="collection" title="How a price gets onto the site">
        <StepList steps={STEPS} />
      </ContentSection>
      <ContentSection id="freshness" title="How we handle prices that may be out of date">
        <PointList points={[
          "Checked within 24 hours: shown and ranked by price.",
          "Checked 24 to 48 hours ago: still ranked by price, marked “may have changed”.",
          "Older than 48 hours: hidden until it's checked again (we keep the history).",
          "Out of stock: shown separately and not ranked.",
        ]} />
      </ContentSection>
      <ContentSection id="fees" title="Fees and totals">
        <PointList points={[
          "The total adds the medicine price, delivery, consultation and any other required fee.",
          "If a fee isn't shown on the pharmacy's page, it's marked “Not listed” and the total is indicative.",
          "Discount codes and first-order offers aren't included, because they don't apply to everyone.",
        ]} />
      </ContentSection>
      <CallToAction title="Think a price is wrong?" body="Tell us which pharmacy and product. Corrections go straight to our staff review queue." href="/ed/pharmacies/claim" label="Request a correction" />
    </PageShell>
  );
}
