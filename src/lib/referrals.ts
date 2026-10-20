import { createHash } from "node:crypto";

import type { GridLayout, ReferralPlacement } from "@/generated/prisma/client";
import { gridLayoutValues } from "@/lib/phone-layout";
import type { PhoneGridLayout } from "@/types/comparison";

// Outbound "view at pharmacy" links (M7). Everything here is pure so the /go route stays thin and
// the rules below are unit-tested. Nothing in this file is — or may ever be — read by ranking code.

export const BOT_CLICKS_PER_HOUR = 20;
export const VISITOR_HASH_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RANK = 500;

// Short, stable URL codes so the query string never carries anything but a page type and a rank.
const placementCodes: Record<ReferralPlacement, string> = {
  COMPARE: "compare",
  INGREDIENT_PRICES: "prices",
  PHARMACY_PROFILE: "pharmacy",
  REPEAT_COSTS: "repeat",
};
const placementByCode = Object.fromEntries(Object.entries(placementCodes).map(([placement, code]) => [code, placement])) as Record<string, ReferralPlacement>;

// `layout`: only on links in a phone price-grid layout, so the A/B test can count their clicks.
export function outboundHref(offerId: string, placement: ReferralPlacement, rank?: number, layout?: PhoneGridLayout) {
  const params = new URLSearchParams({ p: placementCodes[placement] });
  if (rank) params.set("r", String(rank));
  if (layout) params.set("l", layout);
  return `/go/${encodeURIComponent(offerId)}?${params}`;
}

// Unknown or malformed values are dropped, never forwarded or stored as-is.
export function parseOutboundParams(searchParams: URLSearchParams): { placement: ReferralPlacement | null; rankPosition: number | null; gridLayout: GridLayout | null } {
  const placement = placementByCode[searchParams.get("p") ?? ""] ?? null;
  const rank = Number(searchParams.get("r"));
  const rankPosition = Number.isInteger(rank) && rank >= 1 && rank <= MAX_RANK ? rank : null;
  const layout = searchParams.get("l");
  const gridLayout = layout === "compact" || layout === "swipe" ? gridLayoutValues[layout] : null;
  return { placement, rankPosition, gridLayout };
}

// The only destinations /go will redirect to: an https URL on the provider's own reviewed domain
// (or a subdomain of it). Stops the route being used as an open redirect even if a bad sourceUrl
// were ever saved.
export function isAllowedDestination(sourceUrl: string, websiteDomain: string) {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return false;
  }
  const domain = websiteDomain.trim().toLowerCase().replace(/^www\./, "");
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:" && !url.username && !url.password && domain.length > 0 && (host === domain || host.endsWith(`.${domain}`));
}

const botUserAgent = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|curl|wget|python|httpclient|java\/|go-http|axios|node-fetch|scrapy/i;

// Request-level signals only; the per-visitor rate check happens where the click is stored.
export function isLikelyBotRequest(headers: Headers) {
  const userAgent = headers.get("user-agent") ?? "";
  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""} ${headers.get("x-purpose") ?? ""}`;
  return !userAgent || botUserAgent.test(userAgent) || /prefetch|preview/i.test(purpose);
}

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || null;
}

// Salted with a server secret and the UTC date, so the same visitor can't be linked across days
// and the raw IP/user agent are never stored. Cleared from rows after 24h regardless.
export function visitorHash(ip: string | null, userAgent: string, secret: string | undefined, now: Date) {
  if (!ip || !secret) return null;
  const day = now.toISOString().slice(0, 10);
  return createHash("sha256").update(`${secret}|${day}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}
