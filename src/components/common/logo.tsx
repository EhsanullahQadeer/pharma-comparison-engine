import { cn } from "@/lib/utils";

// The brand mark: a "P" whose stem is a capsule and whose bowl is the green ring the brand started
// with. The stem takes the text colour, so it works on light and dark; the ring is always primary.
// The app icons (src/app/icon.svg, apple-icon.png, favicon.ico) are this mark on a dark green tile.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={cn("size-7 shrink-0", className)}>
      <circle cx="17" cy="12" r="6.75" fill="none" strokeWidth="4.5" className="stroke-primary" />
      <rect x="5" y="3" width="6.5" height="26" rx="3.25" className="fill-current" />
    </svg>
  );
}
