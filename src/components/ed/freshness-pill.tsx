import { formatCheckedAgo } from "@/lib/comparison";
import { cn } from "@/lib/utils";
import type { PublicOffer } from "@/types/comparison";

const freshnessStyles: Record<PublicOffer["freshness"], { pill: string; dot: string; suffix: string }> = {
  fresh: { pill: "bg-primary/15 text-foreground", dot: "bg-primary", suffix: "" },
  stale: { pill: "bg-secondary text-secondary-foreground", dot: "bg-muted-foreground", suffix: " · may have changed" },
};

export function FreshnessPill({ freshness, checkedAt, now }: { freshness: PublicOffer["freshness"]; checkedAt: Date; now: Date }) {
  const style = freshnessStyles[freshness];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs", style.pill)}>
      <span className="relative flex size-2">
        {freshness === "fresh" && <span aria-hidden="true" className="absolute inline-flex size-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />}
        <span className={cn("relative inline-flex size-2 rounded-full", style.dot)} />
      </span>
      <time dateTime={checkedAt.toISOString()}>Checked {formatCheckedAgo(checkedAt, now)}</time>
      {style.suffix}
    </span>
  );
}
