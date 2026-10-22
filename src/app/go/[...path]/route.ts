import { randomUUID } from "node:crypto";

import { after, type NextRequest, NextResponse } from "next/server";

import { recordOutboundClick, resolveOutboundDestination } from "@/actions/referrals/outbound-clicks";
import { buildTrackedUrl, linkTemplateError } from "@/lib/affiliate-links";
import { clickDetails } from "@/lib/click-details";
import { clientIp, isLikelyBotRequest, offerIdFromGoPath, parseOutboundParams, visitorHash } from "@/lib/referrals";

// Outbound "view at pharmacy" redirect (M7). A user-facing redirect, not internal data access —
// the documented exception to AGENTS.md Code Rule 2. Only redirects to a published offer's own
// validated pharmacy URL; anything else falls back to the comparison page and isn't counted.
// Paths: /go/<pharmacy>/<product>/<offer id> (readable; only the id matters) and the original
// /go/<offer id>, kept working for links already shared or bookmarked.
const responseHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  // The pharmacy sees that the visit came from us, never which filtered page it came from.
  "Referrer-Policy": "origin",
};

function redirectTo(url: string | URL) {
  return NextResponse.redirect(url, { status: 302, headers: responseHeaders });
}

async function destinationFor(params: Promise<{ path: string[] }>) {
  const offerId = offerIdFromGoPath((await params).path);
  return offerId ? resolveOutboundDestination(offerId) : null;
}

export async function GET(request: NextRequest, { params }: RouteContext<"/go/[...path]">) {
  const target = await destinationFor(params);
  if (!target) return redirectTo(new URL("/ed/compare", request.nextUrl));

  const now = new Date();
  const clickId = randomUUID();
  // Through the partner's tracked link only while its programme is ACTIVE (and the saved template is
  // still valid); otherwise the plain product page, with zero commission assumed.
  const programme = target.programme && !linkTemplateError(target.programme.linkTemplate) ? target.programme : null;
  const redirectUrl = programme ? buildTrackedUrl(programme.linkTemplate, target.destination, clickId) : target.destination;
  const { placement, rankPosition, gridLayout } = parseOutboundParams(request.nextUrl.searchParams);
  const userAgent = request.headers.get("user-agent") ?? "";
  const click = {
    clickId,
    programmeId: programme?.id ?? null,
    target,
    placement,
    rankPosition,
    gridLayout,
    visitorHash: visitorHash(clientIp(request.headers), userAgent, process.env.AUTH_SECRET, now),
    isLikelyBot: isLikelyBotRequest(request.headers),
    details: clickDetails(request.headers),
    now,
  };
  // Logged after the response so counting never slows the visitor down, and a logging failure
  // never blocks the redirect.
  after(() => recordOutboundClick(click).catch((error) => console.error("Failed to record outbound click", error)));

  return redirectTo(redirectUrl);
}

// Link checkers and previews probe with HEAD — send them to the plain product page without counting
// a click or touching the affiliate network.
export async function HEAD(request: NextRequest, { params }: RouteContext<"/go/[...path]">) {
  const target = await destinationFor(params);
  return redirectTo(target ? target.destination : new URL("/ed/compare", request.nextUrl));
}
