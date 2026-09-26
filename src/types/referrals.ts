// A published pharmacy we link to from public pages (an affiliate partner). Also the public
// disclosure list on the independence and partners pages.
export type LinkedProvider = { id: string; name: string; slug: string };

// Where /go/[offerId] may send a visitor: the offer's own validated product page, and — only while
// the pharmacy's affiliate programme is ACTIVE — that programme's tracked-link template.
export type OutboundDestination = {
  offerId: string;
  providerId: string;
  productVariantId: string;
  destination: string;
  programme: { id: string; linkTemplate: string } | null;
};
