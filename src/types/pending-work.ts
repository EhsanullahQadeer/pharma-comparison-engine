// The kinds of work that wait on a staff decision. Each is counted live from the records
// themselves, so a notification disappears as soon as the work is done.
export type PendingWorkKind =
  | "candidates"
  | "productMatches"
  | "evidence"
  | "corrections"
  | "inbox"
  | "articles"
  | "siteOffers"
  | "priceChecks"
  | "draftPrices";

export type PendingWorkPharmacy = { id: string; name: string; count: number };

export type PendingWorkItem = {
  kind: PendingWorkKind;
  count: number;
  // Where the work is done: a review queue, or the pharmacy itself when only one is affected.
  href: string;
  // For work done on a pharmacy's own page: which pharmacies, most pending first.
  pharmacies?: PendingWorkPharmacy[];
};
