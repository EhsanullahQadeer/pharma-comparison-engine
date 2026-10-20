// Price alerts: "email me when <product> <strength> × <pack> costs £X or less".

// One strength × pack a shopper can watch, with today's lowest in-stock delivered total.
export type PriceAlertOption = { strengthMg: number; packQuantity: number; lowestPence: number };

// What the alert sender does with one confirmed alert on one run.
export type PriceAlertDecision = "notify" | "reset" | "none";

export type PriceAlertState = { thresholdPence: number; lastNotifiedAt: Date | null; lastNotifiedPence: number | null };

// The alert as its manage page shows it (looked up by its secret token).
export type PublicPriceAlert = {
  productName: string;
  productSlug: string;
  strengthMg: number;
  packQuantity: number;
  thresholdPence: number;
  confirmed: boolean;
};
