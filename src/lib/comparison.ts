import type { Ingredient } from "@/generated/prisma/client";
import { ingredientLabels, ingredientSlugs, ingredientValues } from "@/lib/catalogue-labels";
import { formatPence } from "@/lib/money";
import type { ComparisonFilters, ComparisonSort, FreshnessTier, PublicOffer, PublicVariant, VariantPriceSummary } from "@/types/comparison";

const HOUR_MS = 60 * 60 * 1000;
// Prices checked within 24h are "fresh"; 24–48h are "stale" (still ranked by price, but labelled
// "may have changed"); beyond 48h the number is suppressed from public view entirely. Evaluated at read time,
// never by mutating rows, so "just verified" and "about to display" can't race.
export const FRESH_WINDOW_MS = 24 * HOUR_MS;
export const STALE_WINDOW_MS = 48 * HOUR_MS;

type FeeParts = { itemPricePence: number; deliveryFeePence: number; consultationFeePence: number; otherMandatoryFeesPence: number };

// Integer pence throughout — never floats (roadmap §4 "Fair price calculation").
export function deliveredTotalPence({ itemPricePence, deliveryFeePence, consultationFeePence, otherMandatoryFeesPence }: FeeParts) {
  return itemPricePence + deliveryFeePence + consultationFeePence + otherMandatoryFeesPence;
}

export function perTabletPence(totalPence: number, packQuantity: number) {
  return Math.round(totalPence / packQuantity);
}

export function freshnessTier(checkedAt: Date, now: Date): FreshnessTier {
  const age = now.getTime() - checkedAt.getTime();
  if (age <= FRESH_WINDOW_MS) return "fresh";
  if (age <= STALE_WINDOW_MS) return "stale";
  return "expired";
}

// Every in-stock offer is ranked by price, whenever it was checked (stale ones are labelled, not
// separated). Out-of-stock offers can't be bought, so they're listed after the ranking.
export function isRankable(offer: PublicOffer) {
  return offer.availability !== "OUT_OF_STOCK";
}

export const offerSortValue: Record<ComparisonSort, (offer: PublicOffer) => number> = {
  tablet: (offer) => offer.perTabletPence,
  total: (offer) => offer.deliveredTotalPence,
};

// Deterministic: indicative (unverified-fee) totals never outrank verified ones, then price,
// then a neutral id tie-break so equal prices never reorder between identical requests.
export function compareOffers(sort: ComparisonSort) {
  const key = offerSortValue[sort];
  return (a: PublicOffer, b: PublicOffer) =>
    Number(b.feesVerified) - Number(a.feesVerified) ||
    key(a) - key(b) ||
    a.deliveredTotalPence - b.deliveredTotalPence ||
    a.providerId.localeCompare(b.providerId) ||
    a.id.localeCompare(b.id);
}

// Scale for the relative price bars — the most expensive offer currently in view.
export function maxSortValue(offers: PublicOffer[], sort: ComparisonSort) {
  return offers.reduce((max, offer) => Math.max(max, offerSortValue[sort](offer)), 0);
}

export function splitRankedOffers(offers: PublicOffer[], sort: ComparisonSort) {
  const sorted = [...offers].sort(compareOffers(sort));
  return { ranked: sorted.filter(isRankable), other: sorted.filter((offer) => !isRankable(offer)) };
}

export function filterOffers(offers: PublicOffer[], { ingredient, strengthMg, packQuantity }: ComparisonFilters) {
  return offers.filter(
    (offer) =>
      (!ingredient || offer.variant.ingredient === ingredient) &&
      (!strengthMg || offer.variant.strengthMg === strengthMg) &&
      (!packQuantity || offer.variant.packQuantity === packQuantity),
  );
}

export function summarizeVariants(offers: PublicOffer[]): VariantPriceSummary[] {
  const byVariant = new Map<string, PublicOffer[]>();
  for (const offer of offers) byVariant.set(offer.variant.id, [...(byVariant.get(offer.variant.id) ?? []), offer]);
  return [...byVariant.values()]
    .map((group) => ({
      variant: group[0].variant,
      offerCount: group.length,
      lowestTotalPence: Math.min(...group.map((offer) => offer.deliveredTotalPence)),
      highestTotalPence: Math.max(...group.map((offer) => offer.deliveredTotalPence)),
      lowestPerTabletPence: Math.min(...group.map((offer) => offer.perTabletPence)),
    }))
    .sort((a, b) => a.variant.ingredient.localeCompare(b.variant.ingredient) || a.variant.strengthMg - b.variant.strengthMg || a.variant.packQuantity - b.variant.packQuantity);
}

const ingredientBySlug = Object.fromEntries(ingredientValues.map((value) => [ingredientSlugs[value], value])) as Record<string, Ingredient>;

function positiveInt(value: string | string[] | undefined) {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function parseComparisonFilters(params: Record<string, string | string[] | undefined>): ComparisonFilters {
  return {
    ingredient: typeof params.medicine === "string" ? ingredientBySlug[params.medicine] : undefined,
    strengthMg: positiveInt(params.strength),
    packQuantity: positiveInt(params.pack),
    sort: params.sort === "total" ? "total" : "tablet",
  };
}

export function comparisonHref({ ingredient, strengthMg, packQuantity, sort }: Partial<ComparisonFilters>) {
  const query = new URLSearchParams();
  if (ingredient) query.set("medicine", ingredientSlugs[ingredient]);
  if (strengthMg) query.set("strength", String(strengthMg));
  if (packQuantity) query.set("pack", String(packQuantity));
  if (sort === "total") query.set("sort", sort);
  const search = query.toString();
  return search ? `/ed/compare?${search}` : "/ed/compare";
}

// Stable, human-readable profile slug from the (unique) website domain: "www.click-pharmacy.co.uk"
// → "click-pharmacy-co-uk". Derived rather than stored, so it can't drift from the domain.
export function providerSlug(websiteDomain: string) {
  return websiteDomain.toLowerCase().replace(/^www\./, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Register-style ALL-CAPS names ("PEAK PHARMACY DIRECT") read as shouting on a public page.
export function displayName(name: string) {
  if (name !== name.toUpperCase()) return name;
  return name.toLowerCase().replace(/(^|[\s(-])(\p{L})/gu, (_, lead: string, letter: string) => lead + letter.toUpperCase());
}

export function variantLabel(variant: PublicVariant) {
  return `${ingredientLabels[variant.ingredient]} ${variant.strengthMg}mg × ${variant.packQuantity}`;
}

export function variantTypeLabel(variant: PublicVariant) {
  return /generic/i.test(variant.formulation) || !variant.brandName ? "Generic" : variant.brandName;
}

const relativeTime = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

export function formatCheckedAgo(checkedAt: Date, now: Date) {
  const minutes = Math.round((checkedAt.getTime() - now.getTime()) / 60_000);
  if (minutes > -60) return relativeTime.format(Math.min(minutes, 0), "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -48) return relativeTime.format(hours, "hour");
  return relativeTime.format(Math.round(hours / 24), "day");
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function formatShortDate(date: Date) {
  return dateFormatter.format(date);
}

// A zero fee is only "Free" once staff have verified the fees; until then it may simply be
// missing from the pharmacy's page, so say so instead of implying it costs nothing.
export function feeText(pence: number, verified: boolean) {
  if (pence > 0) return formatPence(pence);
  return verified ? "Free" : "Not listed";
}
