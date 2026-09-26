import type { PublicDiscount, PublicOffer, PublicProviderProfile } from "@/types/comparison";

export type PharmacyFaq = { id: string; question: string; answer: string };

export type PharmacyStep = { title: string; body: string };

// Everything a pharmacy profile layout renders, derived once from real data so all ten layouts
// say exactly the same (true) things and differ only in arrangement and styling.
export type PharmacyPageModel = {
  provider: PublicProviderProfile;
  // Partner pharmacies get an outbound link; everyone else is listed without one.
  linked: boolean;
  now: Date;
  discounts: PublicDiscount[];
  // Cheapest in-stock price per tablet — the offer the "best offer" card points at.
  bestOffer: PublicOffer | null;
  lowestTotalPence: number | null;
  latestCheckAt: Date | null;
  medicines: string[];
  deliveryText: string;
  regulatorLabel: string;
  registerUrl: string;
  keyFacts: string[];
  steps: PharmacyStep[];
  checklist: PharmacyStep[];
  faqs: PharmacyFaq[];
};
