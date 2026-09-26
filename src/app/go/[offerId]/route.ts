import { randomUUID } from "node:crypto";

import { after, type NextRequest, NextResponse } from "next/server";

import { recordOutboundClick, resolveOutboundDestination } from "@/actions/referrals/outbound-clicks";
import { buildTrackedUrl, linkTemplateError } from "@/lib/affiliate-links";
import { clientIp, isLikelyBotRequest, parseOutboundParams, visitorHash } from "@/lib/referrals";

// Outbound "view at pharmacy" redirect (M7). A user-facing redirect, not internal data access —
// the documented exception to AGENTS.md Code Rule 2. Only redirects to a published offer's own
// validated pharmacy URL; anything else falls back to the comparison page and isn't counted.
const responseHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  // The pharmacy sees that the visit came from us, never which filtered page it came from.
  "Referrer-Policy": "origin",
};

function redirectTo(url: string | URL) {
  return NextResponse.redirect(url, { status: 302, headers: responseHeaders });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const target = await resolveOutboundDestination(offerId);
  if (!target) return redirectTo(new URL("/ed/compare", request.nextUrl));

  const now = new Date();
  const clickId = randomUUID();
  // Through the partner's tracked link only while its programme is ACTIVE (and the saved template is
  // still valid); otherwise the plain product page, with zero commission assumed.
  const programme = target.programme && !linkTemplateError(target.programme.linkTemplate) ? target.programme : null;
  const redirectUrl = programme ? buildTrackedUrl(programme.linkTemplate, target.destination, clickId) : target.destination;
  const { placement, rankPosition } = parseOutboundParams(request.nextUrl.searchParams);
  const userAgent = request.headers.get("user-agent") ?? "";
  const click = {
    clickId,
    programmeId: programme?.id ?? null,
    target,
    placement,
    rankPosition,
    visitorHash: visitorHash(clientIp(request.headers), userAgent, process.env.AUTH_SECRET, now),
    isLikelyBot: isLikelyBotRequest(request.headers),
    now,
  };
  // Logged after the response so counting never slows the visitor down, and a logging failure
  // never blocks the redirect.
  after(() => recordOutboundClick(click).catch((error) => console.error("Failed to record outbound click", error)));

  return redirectTo(redirectUrl);
}

// Link checkers and previews probe with HEAD — send them to the plain product page without counting
// a click or touching the affiliate network.
export async function HEAD(request: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  const target = await resolveOutboundDestination((await params).offerId);
  return redirectTo(target ? target.destination : new URL("/ed/compare", request.nextUrl));
}
