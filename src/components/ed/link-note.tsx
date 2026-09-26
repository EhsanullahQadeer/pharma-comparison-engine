import Link from "@/components/Link";
import { cn } from "@/lib/utils";

// The small line where a pharmacy's link would be. Partner links are labelled as ones we may earn
// from (independence page commitment); pharmacies we don't link to are still fully listed.
export function LinkNote({ linked, className }: { linked: boolean; className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {linked ? <>Partner · <Link href="/ed/independence#partners" className="underline underline-offset-4 hover:text-foreground">we may earn commission</Link></> : "Listed for comparison"}
    </p>
  );
}
