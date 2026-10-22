import { formatPence } from "@/lib/money";
import { cn } from "@/lib/utils";

// The pharmacy's own crossed-out "was" medicine price. Screen readers don't announce strikethrough,
// so the word "was" is spelled out for them.
export function WasPrice({ pence, className }: { pence: number; className?: string }) {
  return (
    <s className={cn("text-xs text-muted-foreground tabular-nums", className)}>
      <span className="sr-only">was </span>{formatPence(pence)}
    </s>
  );
}

// The grid's compact mark for the same thing: its cells show totals, so the medicine-only "was"
// figure is left to the screen-reader text and the "All prices" view.
export function SalePill() {
  return <span className="rounded-full border border-primary/60 px-1.5 py-px text-[0.6875rem] font-medium">Sale</span>;
}

export function saleText(offer: { itemPricePence: number; wasPricePence: number | null }) {
  return offer.wasPricePence === null ? "" : `, on sale: medicine was ${formatPence(offer.wasPricePence)}, now ${formatPence(offer.itemPricePence)}`;
}
