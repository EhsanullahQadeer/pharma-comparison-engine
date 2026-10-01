import { ingredientLabels } from "@/lib/catalogue-labels";
import { compareOffers, formatShortDate, isRankable, variantLabel, variantProductName } from "@/lib/comparison";
import { discountHeadline, providerDiscounts } from "@/lib/discounts";
import { formatPence } from "@/lib/money";
import { regulatorRegisterUrls, regulatorTypeLabels } from "@/lib/provider-labels";
import type { PublicDiscount, PublicOffer, PublicProviderProfile } from "@/types/comparison";
import type { PharmacyFaq, PharmacyPageModel, PharmacyStep } from "@/types/pharmacy-page";

export const PHARMACY_LAYOUT_COUNT = 10;

// "Cialis, Generic tadalafil and Viagra".
const listFormatter = new Intl.ListFormat("en-GB", { style: "long", type: "conjunction" });

// Each pharmacy keeps the same layout on every visit (and for search engines): an FNV-1a hash of
// its slug, not Math.random, so the page is stable, cacheable and hydrates cleanly.
export function pharmacyLayoutIndex(slug: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % PHARMACY_LAYOUT_COUNT;
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

function buildFaqs(provider: PublicProviderProfile, linked: boolean, discounts: PublicDiscount[], bestOffer: PublicOffer | null, delivery: string, regulator: string): PharmacyFaq[] {
  const name = provider.name;
  const discountAnswer = discounts.length > 0
    ? `We have ${discounts.length} discount${discounts.length === 1 ? "" : "s"} on record for ${name}: ${discounts.map(describeDiscount).join("; ")}. Check the terms on the pharmacy's own checkout before paying.`
    : `We don't have a discount code on record for ${name}. We only list discounts our team has checked, so if the pharmacy is running an offer it will show on its own website at checkout.`;
  const priceAnswer = bestOffer
    ? `The lowest current price we've checked is ${formatPence(bestOffer.perTabletPence)} per tablet (${formatPence(bestOffer.deliveredTotalPence)} in total for ${variantLabel(bestOffer.variant)}), last checked ${formatShortDate(bestOffer.checkedAt)}. Every price we hold is listed on this page.`
    : `We haven't published a current price for ${name} yet. Compare other pharmacies in the meantime.`;
  const linkAnswer = linked
    ? `No. The link opens ${provider.websiteDomain}; it doesn't add a discount or skip the consultation. ${name} is a partner, so we may earn commission if you buy, but that never changes the order prices are shown in.`
    : `We don't link to ${name}. Visit ${provider.websiteDomain} directly if you'd like to order; its prices are still listed and ranked in full here.`;

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

export function buildPharmacyPageModel(provider: PublicProviderProfile, linked: boolean, now: Date): PharmacyPageModel {
  const offers = provider.offers;
  const bestOffer = [...offers].filter(isRankable).sort(compareOffers("tablet"))[0] ?? null;
  const discounts = providerDiscounts(offers);
  const regulatorLabel = regulatorTypeLabels[provider.regulatorType];
  const delivery = deliveryText(offers);
  const medicines = [...new Set(offers.map((offer) => ingredientLabels[offer.variant.ingredient]))];
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

  const steps: PharmacyStep[] = [
    { title: "Compare the price", body: `Check ${name}'s prices here against every other listed pharmacy.` },
    { title: "Open the pharmacy's site", body: linked ? `The link opens ${provider.websiteDomain} in a new tab. No discount is added by the link.` : `Go to ${provider.websiteDomain} yourself; we don't link to this pharmacy.` },
    { title: "Complete the consultation", body: "Answer the pharmacy's health questions accurately. It decides whether treatment is suitable." },
  ];

  return {
    provider,
    linked,
    now,
    discounts,
    bestOffer,
    lowestTotalPence: offers.length > 0 ? Math.min(...offers.map((offer) => offer.deliveredTotalPence)) : null,
    latestCheckAt,
    medicines,
    deliveryText: delivery,
    regulatorLabel,
    registerUrl: regulatorRegisterUrls[provider.regulatorType],
    keyFacts,
    steps,
    checklist,
    faqs: buildFaqs(provider, linked, discounts, bestOffer, delivery, regulatorLabel),
  };
}
