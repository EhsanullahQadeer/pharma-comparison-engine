import { DEFAULT_PURCHASE_MODEL, isRankable } from "@/lib/comparison";
import { emailBody } from "@/lib/email-body";
import { formatPence } from "@/lib/money";
import type { PublicOffer } from "@/types/comparison";
import type { PriceAlertDecision, PriceAlertOption, PriceAlertState } from "@/types/price-alerts";

// Pure rules for price alerts; the database and email sending live in the actions and the
// sender script. Prices are the lowest in-stock delivered total (standard price, no codes) — the
// same figure the grid ranks by — so an alert can never fire on a price the grid doesn't show.

const HOUR_MS = 60 * 60 * 1000;
// At most one email per alert per day, however often prices are checked.
export const ALERT_COOLDOWN_MS = 24 * HOUR_MS;
// Unconfirmed sign-ups are deleted after this; confirmed alerts after a year.
export const UNCONFIRMED_TTL_MS = 48 * HOUR_MS;
export const ALERT_LIFETIME_MS = 365 * 24 * HOUR_MS;
// A visitor can watch this many prices per email address.
export const MAX_ALERTS_PER_EMAIL = 10;

// The cheapest in-stock one-off delivered total for one strength × pack of a product's offers —
// the price the grid shows by default (a subscription price is never compared with it).
export function lowestTotalPence(offers: PublicOffer[], strengthMg: number, packQuantity: number) {
  const totals = offers.filter((offer) => isRankable(offer) && offer.purchaseModel === DEFAULT_PURCHASE_MODEL && offer.variant.strengthMg === strengthMg && offer.variant.packQuantity === packQuantity).map((offer) => offer.deliveredTotalPence);
  return totals.length > 0 ? Math.min(...totals) : null;
}

// Every strength × pack of a product with a current in-stock price, smallest first.
export function priceAlertOptions(offers: PublicOffer[]): PriceAlertOption[] {
  const keys = new Map<string, { strengthMg: number; packQuantity: number }>();
  for (const { variant } of offers) keys.set(`${variant.strengthMg}x${variant.packQuantity}`, { strengthMg: variant.strengthMg, packQuantity: variant.packQuantity });
  return [...keys.values()]
    .flatMap((key) => {
      const lowestPence = lowestTotalPence(offers, key.strengthMg, key.packQuantity);
      return lowestPence === null ? [] : [{ ...key, lowestPence }];
    })
    .sort((a, b) => a.strengthMg - b.strengthMg || a.packQuantity - b.packQuantity);
}

export function alertTargetKey(strengthMg: number, packQuantity: number) {
  return `${strengthMg}x${packQuantity}`;
}

export function parseAlertTarget(key: string) {
  const match = /^(\d{1,4})x(\d{1,3})$/.exec(key);
  return match ? { strengthMg: Number(match[1]), packQuantity: Number(match[2]) } : null;
}

// Email once when the lowest price reaches the target; again only if it falls further (at most
// daily). Going back above the target re-arms the alert, so a later dip is reported.
export function alertDecision({ thresholdPence, lastNotifiedAt, lastNotifiedPence }: PriceAlertState, lowestPence: number | null, now: Date): PriceAlertDecision {
  if (lowestPence === null) return "none";
  if (lowestPence > thresholdPence) return lastNotifiedPence === null ? "none" : "reset";
  const cooledDown = !lastNotifiedAt || now.getTime() - lastNotifiedAt.getTime() >= ALERT_COOLDOWN_MS;
  const lower = lastNotifiedPence === null || lowestPence < lastNotifiedPence;
  return cooledDown && lower ? "notify" : "none";
}

export function alertTargetLabel(productName: string, strengthMg: number, packQuantity: number) {
  return `${productName} ${strengthMg}mg × ${packQuantity}`;
}

const FOOTER = "You're getting this because you asked for a price alert on our site. We only use your email address for this alert, and delete it when you stop the alert or after a year.";

export function confirmationEmail({ target, thresholdPence, manageUrl }: { target: string; thresholdPence: number; manageUrl: string }) {
  return {
    subject: `Confirm your price alert: ${target}`,
    ...emailBody(
      [`Please confirm you'd like an email when ${target} costs ${formatPence(thresholdPence)} or less, including delivery, at any listed pharmacy.`, "If you didn't ask for this, ignore this email and we'll delete your address within 48 hours."],
      { url: manageUrl, label: "Confirm my price alert" },
      FOOTER,
    ),
  };
}

export function priceDropEmail({ target, thresholdPence, lowestPence, compareUrl, manageUrl }: { target: string; thresholdPence: number; lowestPence: number; compareUrl: string; manageUrl: string }) {
  return {
    subject: `Price alert: ${target} is now ${formatPence(lowestPence)}`,
    ...emailBody(
      [
        `${target} is now ${formatPence(lowestPence)} including delivery at the cheapest listed pharmacy, at or below your ${formatPence(thresholdPence)} target.`,
        `See every pharmacy's price: ${compareUrl}`,
        "Prices change often; always check the final price at the pharmacy's checkout. The pharmacy's own prescriber or pharmacist decides whether a treatment is suitable for you.",
      ],
      { url: manageUrl, label: "Change or stop this alert" },
      FOOTER,
    ),
  };
}
