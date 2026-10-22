import type { Ingredient, PaymentMethod, PurchaseModel } from "@/generated/prisma/client";
import { ingredientLabels, ingredientSlugs, ingredientValues } from "@/lib/catalogue-labels";
import { formatPence } from "@/lib/money";
import { paymentMethodLabels, paymentMethodValues, serviceRegionOptions } from "@/lib/provider-labels";
import type { ComparisonFilters, ComparisonSort, FreshnessTier, GridFilterFlags, PhoneGridLayout, PublicOffer, PublicVariant, VariantPriceSummary } from "@/types/comparison";

const HOUR_MS = 60 * 60 * 1000;
// Prices checked within 24h are "fresh"; anything older is "stale" (still shown and ranked by
// price, but labelled "may have changed"). No price is hidden for its age. Evaluated at read time,
// never by mutating rows, so "just verified" and "about to display" can't race.
export const FRESH_WINDOW_MS = 24 * HOUR_MS;

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
  return age <= FRESH_WINDOW_MS ? "fresh" : "stale";
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

export function filterOffers(offers: PublicOffer[], { ingredient, productType, strengthMg, formulation, packQuantity, purchaseModel }: ComparisonFilters) {
  return offers.filter(
    (offer) =>
      (!ingredient || offer.variant.ingredient === ingredient) &&
      (!productType || variantTypeSlug(offer.variant) === productType) &&
      (!strengthMg || offer.variant.strengthMg === strengthMg) &&
      (!formulation || slugify(baseFormulation(offer.variant)) === formulation) &&
      (!packQuantity || offer.variant.packQuantity === packQuantity) &&
      (!purchaseModel || offer.purchaseModel === purchaseModel),
  );
}

// The offers a ranked list compares: the filters, plus only one way of buying (one-off by default).
// filterOffers alone leaves an unset plan open, for working out which choices exist.
export function comparedOffers(offers: PublicOffer[], filters: ComparisonFilters) {
  return filterOffers(offers, { ...filters, purchaseModel: comparedPurchaseModel(filters.purchaseModel) });
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

// Public wording: "Recurring" is the admin term; visitors know it as a subscription.
export const purchaseModelSlugs: Record<PurchaseModel, string> = { ONE_OFF: "one-off", RECURRING: "subscription" };
export const publicPurchaseModelLabels: Record<PurchaseModel, string> = { ONE_OFF: "One-off", RECURRING: "Subscription" };
const purchaseModelBySlug = Object.fromEntries(Object.entries(purchaseModelSlugs).map(([model, slug]) => [slug, model])) as Record<string, PurchaseModel>;

// Prices are only compared within one way of buying (roadmap §4.7): one-off unless the shopper
// chooses subscriptions, never both in one ranking. One-off is the default, so it has no URL value.
export const DEFAULT_PURCHASE_MODEL: PurchaseModel = "ONE_OFF";

export function comparedPurchaseModel(purchaseModel: PurchaseModel | undefined) {
  return purchaseModel ?? DEFAULT_PURCHASE_MODEL;
}

// How a subscription bills, in the shopper's words (roadmap §4.7: show the real interval and
// quantity, never call every plan "monthly"). `short` fits a grid cell. Null for a one-off purchase.
export function subscriptionTerms(offer: Pick<PublicOffer, "purchaseModel" | "billingPeriodDays" | "variant">) {
  if (offer.purchaseModel === DEFAULT_PURCHASE_MODEL) return null;
  const interval = offer.billingPeriodDays ? `every ${offer.billingPeriodDays} days` : null;
  return {
    full: `Subscription: ${offer.variant.packQuantity} tablets ${interval ?? "per order — the pharmacy doesn't state how often it bills"}`,
    short: interval ?? "interval not stated",
  };
}

function planParam(value: string | string[] | undefined) {
  const model = typeof value === "string" ? purchaseModelBySlug[value] : undefined;
  return model === DEFAULT_PURCHASE_MODEL ? undefined : model;
}

function positiveInt(value: string | string[] | undefined) {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

// Free-text slugs (type/form) only need to be well-formed: an unknown one simply matches nothing.
function slugParam(value: string | string[] | undefined) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : undefined;
}

// The grid's on/off filters and the URL parameter (and value) that switches each one on.
export const gridFlagParams: Record<keyof GridFilterFlags, [param: string, value: string]> = {
  inStock: ["stock", "in"],
  freeDelivery: ["delivery", "free"],
  noConsultation: ["consultation", "none"],
  verifiedOnly: ["fees-checked", "yes"],
  hasDiscount: ["discount", "yes"],
  nextDay: ["next-day", "yes"],
  discreet: ["discreet", "yes"],
  inspectionPassed: ["inspection", "passed"],
};

// "Delivers to my area", payment method and minimum Trustpilot score, as readable URL slugs.
const regionBySlug = Object.fromEntries(serviceRegionOptions.map((region) => [slugify(region), region])) as Record<string, string>;
export const paymentMethodSlugs = Object.fromEntries(paymentMethodValues.map((method) => [method, slugify(paymentMethodLabels[method])])) as Record<PaymentMethod, string>;
const paymentBySlug = Object.fromEntries(paymentMethodValues.map((method) => [paymentMethodSlugs[method], method])) as Record<string, PaymentMethod>;
export const trustpilotMinimums = [30, 40, 45];
const gridFlagKeys = Object.keys(gridFlagParams) as (keyof GridFilterFlags)[];

const phoneLayouts: PhoneGridLayout[] = ["compact", "swipe"];

// Pharmacy search: trimmed and capped, so the URL can't carry an essay into the page.
function queryParam(value: string | string[] | undefined) {
  const query = typeof value === "string" ? value.trim().slice(0, 60) : "";
  return query || undefined;
}

export function parseComparisonFilters(params: Record<string, string | string[] | undefined>): ComparisonFilters {
  return {
    view: params.view === "list" ? "list" : "grid",
    anyPack: params.pack === "any",
    mode: params.mode === "tablet" ? "tablet" : "total",
    medicineOnly: params.fees === "medicine",
    column: positiveInt(params.col),
    query: queryParam(params.q),
    codes: params.codes === "on",
    layout: phoneLayouts.includes(params.layout as PhoneGridLayout) ? (params.layout as PhoneGridLayout) : undefined,
    region: typeof params.region === "string" ? regionBySlug[params.region] : undefined,
    payment: typeof params.payment === "string" ? paymentBySlug[params.payment] : undefined,
    minTrustpilot: trustpilotMinimums.find((tenths) => params.trustpilot === String(tenths / 10)),
    ...Object.fromEntries(gridFlagKeys.map((key) => [key, params[gridFlagParams[key][0]] === gridFlagParams[key][1]])),
    ingredient: typeof params.medicine === "string" ? ingredientBySlug[params.medicine] : undefined,
    productType: slugParam(params.type),
    strengthMg: positiveInt(params.strength),
    formulation: slugParam(params.form),
    packQuantity: positiveInt(params.pack),
    purchaseModel: planParam(params.plan),
    sort: params.sort === "total" ? "total" : "tablet",
  };
}

// Defaults are left out, so every view has one short, stable URL. `path` lets a product price page
// reuse the same parameters for its own grid.
export function comparisonHref(filters: Partial<ComparisonFilters>, path = "/ed/compare") {
  const { ingredient, productType, strengthMg, formulation, packQuantity, purchaseModel, sort, view, anyPack, mode, medicineOnly, column, query: search, codes, layout, region, payment, minTrustpilot } = filters;
  const query = new URLSearchParams();
  if (view === "list") query.set("view", view);
  if (ingredient) query.set("medicine", ingredientSlugs[ingredient]);
  if (productType) query.set("type", productType);
  if (strengthMg) query.set("strength", String(strengthMg));
  if (formulation) query.set("form", formulation);
  if (anyPack) query.set("pack", "any");
  else if (packQuantity) query.set("pack", String(packQuantity));
  if (purchaseModel) query.set("plan", purchaseModelSlugs[purchaseModel]);
  if (sort === "total") query.set("sort", sort);
  if (mode === "tablet") query.set("mode", mode);
  if (medicineOnly) query.set("fees", "medicine");
  if (column) query.set("col", String(column));
  if (search) query.set("q", search);
  if (codes) query.set("codes", "on");
  if (layout) query.set("layout", layout);
  if (region) query.set("region", slugify(region));
  if (payment) query.set("payment", paymentMethodSlugs[payment]);
  if (minTrustpilot) query.set("trustpilot", String(minTrustpilot / 10));
  for (const key of gridFlagKeys) if (filters[key]) query.set(...gridFlagParams[key]);
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

// Stable, human-readable profile slug from the (unique) website domain: "www.click-pharmacy.co.uk"
// → "click-pharmacy-co-uk". Derived rather than stored, so it can't drift from the domain.
export function providerSlug(websiteDomain: string) {
  return slugify(websiteDomain.replace(/^www\./i, ""));
}

// Register-style ALL-CAPS names ("PEAK PHARMACY DIRECT") read as shouting on a public page.
export function displayName(name: string) {
  if (name !== name.toUpperCase()) return name;
  return name.toLowerCase().replace(/(^|[\s(-])(\p{L})/gu, (_, lead: string, letter: string) => lead + letter.toUpperCase());
}

export function variantTypeLabel(variant: PublicVariant) {
  return /generic/i.test(variant.formulation) || !variant.brandName ? "Generic" : variant.brandName;
}

// The name shoppers know a product by: its brand ("Viagra"), or "Generic sildenafil" when it is
// unbranded. Public headings lead with this, not with the medicine's name.
export function variantProductName(variant: PublicVariant) {
  const type = variantTypeLabel(variant);
  return type === "Generic" ? `Generic ${ingredientLabels[variant.ingredient].toLowerCase()}` : type;
}

export function variantLabel(variant: PublicVariant) {
  return `${variantProductName(variant)} ${variant.strengthMg}mg × ${variant.packQuantity}`;
}

// The line under a product heading: the medicine a branded product contains. A generic already
// carries the medicine's name in its heading, so it is described as unbranded instead.
export function variantMedicineNote(variant: PublicVariant) {
  return variantTypeLabel(variant) === "Generic" ? "Unbranded" : `Contains ${ingredientLabels[variant.ingredient].toLowerCase()}`;
}

// The element id of one price on a pharmacy's page, so a price elsewhere can link straight to it.
export function offerAnchor(offerId: string) {
  return `offer-${offerId}`;
}

export function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function variantTypeSlug(variant: PublicVariant) {
  return slugify(variantTypeLabel(variant));
}

// "Film-coated tablet (generic, daily dose)" → "Film-coated tablet": generic and daily-dose are
// already covered by the type and strength filters.
export function baseFormulation(variant: PublicVariant) {
  return variant.formulation.replace(/\s*\(.*\)\s*$/, "");
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

// UK time whatever the server's zone: "18 Oct 2026, 15:40".
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });

export function formatCheckedDateTime(date: Date) {
  return dateTimeFormatter.format(date);
}

// A zero fee is only "Free" once staff have verified the fees; until then it may simply be
// missing from the pharmacy's page, so say so instead of implying it costs nothing.
export function feeText(pence: number, verified: boolean) {
  if (pence > 0) return formatPence(pence);
  return verified ? "Free" : "Not listed";
}
