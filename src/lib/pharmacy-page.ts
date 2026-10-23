import { baseFormulation, compareOffers, formatShortDate, isRankable, variantLabel, variantProductName } from "@/lib/comparison";
import { discountHeadline, providerDiscounts } from "@/lib/discounts";
import { formatPence } from "@/lib/money";
import { regulatorRegisterUrls, regulatorTypeLabels } from "@/lib/provider-labels";
import type { PublicDiscount, PublicOffer, PublicProviderProfile } from "@/types/comparison";
import type { PharmacyFaq, PharmacyPageModel, PharmacyStep, ProfilePriceGrid } from "@/types/pharmacy-page";

// "Cialis, Generic tadalafil and Viagra".
const listFormatter = new Intl.ListFormat("en-GB", { style: "long", type: "conjunction" });

const STANDARD_FORM = /^(film-coated )?tablets?$/i;

// What tells a grid apart from the product's standard one: an unusual form ("Orodispersible
// tablet") and any qualifier other than "generic" ("daily dose"). Null for a standard tablet.
export function formNote(variant: PublicOffer["variant"]) {
  const base = baseFormulation(variant);
  const qualifiers = (variant.formulation.match(/\(([^)]*)\)/)?.[1] ?? "").split(",").map((part) => part.trim()).filter((part) => part && !/^generic$/i.test(part));
  const parts = [STANDARD_FORM.test(base) ? null : base, ...qualifiers].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export const priceCellKey = (strengthMg: number, packQuantity: number) => `${strengthMg}x${packQuantity}`;
const ascending = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

// This pharmacy's prices as one grid per product (strengths across, packs down), split by form and
// by one-off vs subscription. Within a cell, in-stock and cheaper offers come first.
export function buildProfilePriceGrids(offers: PublicOffer[]): ProfilePriceGrid[] {
  const groups = Map.groupBy(offers, (offer) => [variantProductName(offer.variant), formNote(offer.variant) ?? "", offer.purchaseModel].join("|"));
  return [...groups.entries()]
    .map(([key, group]): ProfilePriceGrid => {
      const cells: Record<string, PublicOffer[]> = {};
      for (const offer of [...group].sort((a, b) => Number(isRankable(b)) - Number(isRankable(a)) || a.perTabletPence - b.perTabletPence)) {
        (cells[priceCellKey(offer.variant.strengthMg, offer.variant.packQuantity)] ??= []).push(offer);
      }
      const priced = group.filter(isRankable);
      const best = priced.length > 1 ? [...priced].sort(compareOffers("tablet"))[0] : null;
      return {
        key,
        product: variantProductName(group[0].variant),
        formNote: formNote(group[0].variant),
        subscription: group[0].purchaseModel === "RECURRING",
        strengths: ascending(group.map((offer) => offer.variant.strengthMg)),
        packs: ascending(group.map((offer) => offer.variant.packQuantity)),
        cells,
        bestValueOfferId: best?.id ?? null,
        latestCheckAt: new Date(Math.max(...group.map((offer) => offer.checkedAt.getTime()))),
      };
    })
    .sort((a, b) => a.product.localeCompare(b.product) || Number(a.subscription) - Number(b.subscription) || (a.formNote ?? "").localeCompare(b.formNote ?? ""));
}

function describeDiscount(discount: PublicDiscount) {
  const code = discount.code ? `code ${discount.code}` : "no code needed";
  const expiry = discount.expiresAt ? `, until ${formatShortDate(discount.expiresAt)}` : "";
  return `${discountHeadline(discount)} for ${discount.eligibility.toLowerCase()} (${code}${expiry})`;
}

// Delivery wording follows feeText's rule: a £0 fee only reads as "free" once staff verified it.
function deliveryText(offers: PublicOffer[]) {
  const verified = offers.filter((offer) => offer.feesVerified);
  if (verified.length === 0) return "Delivery charges haven't been verified yet, so totals are indicative.";
  const fees = verified.map((offer) => offer.deliveryFeePence);
  const [min, max] = [Math.min(...fees), Math.max(...fees)];
  if (max === 0) return "Delivery is free on every price we've verified.";
  if (min === max) return `Delivery costs ${formatPence(min)} on the prices we've verified.`;
  return `Delivery costs ${min === 0 ? "nothing" : formatPence(min)} to ${formatPence(max)}, depending on the order.`;
}

function buildFaqs(provider: PublicProviderProfile, partner: boolean, discounts: PublicDiscount[], bestOffer: PublicOffer | null, delivery: string, regulator: string): PharmacyFaq[] {
  const name = provider.name;
  const discountAnswer = discounts.length > 0
    ? `We have ${discounts.length} discount${discounts.length === 1 ? "" : "s"} on record for ${name}: ${discounts.map(describeDiscount).join("; ")}. Check the terms on the pharmacy's own checkout before paying.`
    : `We don't have a discount code on record for ${name}. We only list discounts our team has checked, so if the pharmacy is running an offer it will show on its own website at checkout.`;
  const priceAnswer = bestOffer
    ? `The lowest current price we've checked is ${formatPence(bestOffer.perTabletPence)} per tablet (${formatPence(bestOffer.deliveredTotalPence)} in total for ${variantLabel(bestOffer.variant)}), last checked ${formatShortDate(bestOffer.checkedAt)}. Every price we hold is listed on this page.`
    : `We haven't published a current price for ${name} yet. Compare other pharmacies in the meantime.`;
  const linkAnswer = `No. The link opens ${provider.websiteDomain}; it doesn't add a discount or skip the consultation. ${partner
    ? `${name} is a partner, so we may earn commission if you buy, but that never changes the order prices are shown in.`
    : `We have no commercial relationship with ${name} and earn nothing if you buy.`}`;

  return [
    { id: "discount-code", question: `Does ${name} have a discount code?`, answer: discountAnswer },
    { id: "price", question: `How much does ${name} charge?`, answer: priceAnswer },
    { id: "registered", question: `Is ${name} a registered pharmacy?`, answer: `${provider.legalName} is listed with the ${regulator} under reference ${provider.regulatorReference}. Check the live record on the public register rather than relying on this page alone.` },
    { id: "delivery", question: `How much is delivery from ${name}?`, answer: delivery },
    { id: "link", question: "Does the link on this page add a discount?", answer: linkAnswer },
    { id: "consultation", question: "Do I still need a consultation?", answer: `Yes. ${name} will ask you health questions before it can supply ED treatment, and it decides whether treatment is suitable for you. We compare prices; we don't give medical advice.` },
  ];
}

const checklist: PharmacyStep[] = [
  { title: "Check the current price", body: "Use the amount shown at the pharmacy's checkout, before you enter payment details." },
  { title: "Read the offer terms", body: "An offer may only apply to new customers, certain strengths or a first order." },
  { title: "Include delivery", body: "Compare the amount you'll actually pay, not just the headline tablet price." },
  { title: "Think about repeat orders", body: "The cheapest first order isn't always the cheapest over several months." },
];

export function buildPharmacyPageModel(provider: PublicProviderProfile, partner: boolean, now: Date): PharmacyPageModel {
  const offers = provider.offers;
  const bestOffer = [...offers].filter(isRankable).sort(compareOffers("tablet"))[0] ?? null;
  const discounts = providerDiscounts(offers);
  const regulatorLabel = regulatorTypeLabels[provider.regulatorType];
  const delivery = deliveryText(offers);
  const products = [...new Set(offers.map((offer) => variantProductName(offer.variant)))].sort();
  const latestCheckAt = offers.length > 0 ? new Date(Math.max(...offers.map((offer) => offer.checkedAt.getTime()))) : null;
  const name = provider.name;

  const keyFacts = [
    `${provider.legalName} is registered with the ${regulatorLabel}, reference ${provider.regulatorReference}.`,
    bestOffer
      ? `Prices start at ${formatPence(bestOffer.perTabletPence)} per tablet across ${offers.length} current price${offers.length === 1 ? "" : "s"}${products.length > 0 ? ` for ${listFormatter.format(products)}` : ""}.`
      : `We haven't published a current price for ${name} yet.`,
    discounts.length > 0 ? `${discounts.length} checked discount${discounts.length === 1 ? "" : "s"} on record: ${discounts.map(discountHeadline).join(", ")}.` : "No discount code on record. Any offer would show at the pharmacy's own checkout.",
    delivery,
    `The consultation and purchase happen on ${provider.websiteDomain}, not on this site.`,
  ];

  return {
    provider,
    partner,
    now,
    discounts,
    bestOffer,
    lowestTotalPence: offers.length > 0 ? Math.min(...offers.map((offer) => offer.deliveredTotalPence)) : null,
    latestCheckAt,
    deliveryText: delivery,
    regulatorLabel,
    registerUrl: regulatorRegisterUrls[provider.regulatorType],
    keyFacts,
    checklist,
    faqs: buildFaqs(provider, partner, discounts, bestOffer, delivery, regulatorLabel),
    priceGrids: buildProfilePriceGrids(offers),
  };
}
