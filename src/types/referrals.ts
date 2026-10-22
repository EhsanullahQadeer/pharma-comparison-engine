import type { ClickDevice, GridLayout } from "@/generated/prisma/client";
import type { PublicOffer } from "@/types/comparison";

// What an outbound link needs to build its readable address: /go/<pharmacy>/<product>/<offer id>.
export type OutboundOffer = Pick<PublicOffer, "id" | "providerSlug" | "variant">;

// A published pharmacy we have a commercial relationship with (an affiliate partner): the public
// disclosure list on the independence and partners pages.
export type PartnerProvider = { id: string; name: string; slug: string };

// Anonymous marketing detail stored with an outbound click; each is null when it can't be told.
export type ClickDetails = {
  country: string | null;
  region: string | null;
  city: string | null;
  deviceType: ClickDevice | null;
  browser: string | null;
  os: string | null;
  // The page of ours the visitor clicked from, with its filters.
  sourcePath: string | null;
};

// Where /go/…/[offer id] may send a visitor: the offer's own validated product page, and — only while
// the pharmacy's affiliate programme is ACTIVE — that programme's tracked-link template.
export type OutboundDestination = {
  offerId: string;
  providerId: string;
  productVariantId: string;
  destination: string;
  // The offer's total to pay when the visitor clicked.
  totalPricePence: number;
  programme: { id: string; linkTemplate: string } | null;
};

// One phone price-grid layout's results in the A/B test report.
export type LayoutTestRow = {
  layout: GridLayout;
  pageViews: number;
  clicks: number;
  // Days with at least one phone page view of this layout.
  days: number;
  // Clicks per page view; null before any page view is counted.
  clickThrough: number | null;
};
