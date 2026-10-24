import type { PublicDiscount, PublicOffer, PublicProviderProfile } from "@/types/comparison";

export type PharmacyFaq = { id: string; question: string; answer: string };

export type PharmacyStep = { title: string; body: string };

// One product's prices at this pharmacy as a small grid: strengths across, pack sizes down. Split
// by form (film-coated vs orodispersible) and by plan, so every cell compares like with like.
// A cell normally holds one offer; it holds every offer for that cell rather than dropping one.
export type ProfilePriceGrid = {
  key: string;
  product: string;
  // "Orodispersible tablet", "daily dose"… — only when it tells this grid apart from a standard one.
  formNote: string | null;
  subscription: boolean;
  strengths: number[];
  packs: number[];
  cells: Record<string, PublicOffer[]>;
  // Cheapest in-stock price per tablet in this grid (marked "Best value"), when several are priced.
  bestValueOfferId: string | null;
  latestCheckAt: Date;
};

// Everything the pharmacy profile page renders, derived once from real data so every block says
// exactly the same (true) things.
export type PharmacyPageModel = {
  provider: PublicProviderProfile;
  // An affiliate partner: its outbound link is labelled as one we may earn from. Every pharmacy is linked.
  partner: boolean;
  now: Date;
  discounts: PublicDiscount[];
  // Cheapest in-stock price per tablet — the offer the header's "Visit" button points at.
  bestOffer: PublicOffer | null;
  lowestTotalPence: number | null;
  latestCheckAt: Date | null;
  deliveryText: string;
  regulatorLabel: string;
  registerUrl: string;
  keyFacts: string[];
  checklist: PharmacyStep[];
  faqs: PharmacyFaq[];
  priceGrids: ProfilePriceGrid[];
  // Arrived from a comparison-grid price: only this product's grid is shown.
  focusedGrid: ProfilePriceGrid | null;
};
