"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { getPublicOffers } from "@/actions/offers/public-offers";
import { priceAlertSchema, type PriceAlertValues } from "@/actions/price-alerts/price-alert-schema";
import type { PublicFormState } from "@/actions/submissions/public-submissions";
import { edHref } from "@/lib/ed-pages";
import { edProducts, productOffers } from "@/lib/ed-products";
import { mailerConfigured, sendEmail } from "@/lib/mailer";
import { alertTargetLabel, confirmationEmail, MAX_ALERTS_PER_EMAIL, parseAlertTarget, priceAlertOptions } from "@/lib/price-alerts";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site-url";
import { checkSubmission } from "@/lib/spam-guard";
import type { PublicPriceAlert } from "@/types/price-alerts";

// Public (anyone can sign up), so every action here re-validates its input and acts only through
// an alert's own secret token. Unsubscribing deletes the row: nothing is kept once an alert stops.

const UNAVAILABLE = "Price alerts aren't available right now. Please try again later.";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

// Not exported: every export of a "use server" file is a callable endpoint.
function manageUrl(token: string) {
  return new URL(edHref(`alerts/${token}`), siteUrl).href;
}

export async function createPriceAlert(values: PriceAlertValues): Promise<PublicFormState> {
  const parsed = priceAlertSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  if (!mailerConfigured() || !siteUrl) return { error: UNAVAILABLE };
  const verdict = await checkSubmission(parsed.data);
  if (verdict === "rate-limited") return { error: "You've set up several alerts in a short time. Please try again in a few minutes." };
  if (verdict === "silent-drop") return { ok: true };

  const product = edProducts.find((entry) => entry.slug === parsed.data.productSlug);
  const target = parseAlertTarget(parsed.data.target);
  // Only a strength × pack that has a current price can be watched.
  const options = product ? priceAlertOptions(productOffers(await getPublicOffers(), product)) : [];
  if (!product || !target || !options.some((option) => option.strengthMg === target.strengthMg && option.packQuantity === target.packQuantity)) {
    return { error: "That strength and pack doesn't have a current price. Choose another." };
  }
  const email = parsed.data.email.trim().toLowerCase();
  if ((await prisma.priceAlert.count({ where: { email } })) >= MAX_ALERTS_PER_EMAIL) {
    return { error: `You already have ${MAX_ALERTS_PER_EMAIL} price alerts. Stop one from a link in its emails to add another.` };
  }

  const token = randomBytes(24).toString("base64url");
  const thresholdPence = Math.round(Number(parsed.data.threshold.replace("£", "")) * 100);
  const alert = await prisma.priceAlert.create({ data: { email, productSlug: product.slug, ...target, thresholdPence, token } });
  try {
    const message = confirmationEmail({ target: alertTargetLabel(product.name, target.strengthMg, target.packQuantity), thresholdPence, manageUrl: manageUrl(token) });
    await sendEmail({ to: email, ...message });
  } catch {
    // No email, no alert: don't keep an address we couldn't confirm.
    await prisma.priceAlert.delete({ where: { id: alert.id } });
    return { error: UNAVAILABLE };
  }
  return { ok: true };
}

export async function getPriceAlertByToken(token: string): Promise<PublicPriceAlert | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const alert = await prisma.priceAlert.findUnique({ where: { token } });
  const product = alert && edProducts.find((entry) => entry.slug === alert.productSlug);
  if (!alert || !product) return null;
  return { productName: product.name, productSlug: product.slug, strengthMg: alert.strengthMg, packQuantity: alert.packQuantity, thresholdPence: alert.thresholdPence, confirmed: alert.confirmedAt !== null };
}

// Confirmation is a button on the alert's page, not the link itself: mail scanners open links,
// and opening one must never sign anyone up.
export async function confirmPriceAlert(token: string) {
  if (!TOKEN_PATTERN.test(token)) return;
  await prisma.priceAlert.updateMany({ where: { token, confirmedAt: null }, data: { confirmedAt: new Date() } });
  revalidatePath(edHref(`alerts/${token}`));
}

export async function deletePriceAlert(token: string) {
  if (!TOKEN_PATTERN.test(token)) return;
  await prisma.priceAlert.deleteMany({ where: { token } });
  revalidatePath(edHref(`alerts/${token}`));
}
