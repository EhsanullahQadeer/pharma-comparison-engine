import type { ReferralPlacement } from "@/generated/prisma/client";
import { outboundHref } from "@/lib/referrals";

import type { ComponentProps } from "react";

type OutboundLinkProps = Omit<ComponentProps<"a">, "href" | "target" | "rel"> & {
  offerId: string;
  placement: ReferralPlacement;
  // An affiliate partner: the link may earn us commission, so it's marked rel="sponsored".
  partner: boolean;
  rank?: number;
};

// "View at pharmacy" goes through /go/[offerId], which validates the destination, counts the click
// and redirects. A plain <a> (not the app Link) so it's never prefetched and never counts as a click.
// Accepts the props a Button `render` merges in (className, handlers, ref).
export function OutboundLink({ offerId, placement, partner, rank, ...props }: OutboundLinkProps) {
  return <a {...props} href={outboundHref(offerId, placement, rank)} target="_blank" rel={partner ? "nofollow sponsored noopener" : "nofollow noopener"} />;
}
