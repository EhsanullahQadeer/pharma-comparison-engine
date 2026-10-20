import { ArrowDown, ArrowUp } from "lucide-react";

import { OutboundLink } from "@/components/ed/outbound-link";
import type { ReferralPlacement } from "@/generated/prisma/client";
import { variantProductName } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { codeSavingPence, gridValuePence, type GridPricing } from "@/lib/price-grid";
import { cn } from "@/lib/utils";
import type { GridCell, PhoneGridLayout, PublicOffer } from "@/types/comparison";

// `short`: narrow phone columns, where "£1.20 per tablet" becomes "£1.20/tab".
// `layout`: set inside a phone layout, so its clicks count towards that layout in the A/B test.
type CellContext = { pricing: GridPricing; anyPack: boolean; placement: ReferralPlacement; rank: number; partner: boolean; short?: boolean; layout?: PhoneGridLayout };
type PriceCellProps = CellContext & { offer: PublicOffer; valuePence: number; lowest: boolean };

// The small line under the price: the other measure (per tablet under a pack total, the pack total
// under a per-tablet price), and the pack size when "Any pack" lets it differ from cell to cell.
function secondaryLine(offer: PublicOffer, pricing: GridPricing, anyPack: boolean, short: boolean) {
  const pack = offer.variant.packQuantity;
  if (pricing.mode === "total") return `${formatPence(gridValuePence(offer, { ...pricing, mode: "tablet" }))}${short ? "/tab" : " per tablet"}`;
  const total = formatPence(gridValuePence(offer, { ...pricing, mode: "total" }));
  return anyPack ? `${pack} tabs · ${total}` : `${total} for ${pack}`;
}

// "↓ 20p" / "↑ 10p" against the previous check — an icon and the amount, never colour alone.
export function PriceChange({ pence }: { pence: number }) {
  const Icon = pence < 0 ? ArrowDown : ArrowUp;
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums">
      <Icon className="size-3" />{formatPence(Math.abs(pence))}
    </span>
  );
}

function movementText(offer: PublicOffer) {
  const change = offer.priceChangePence === null ? "" : `, ${offer.priceChangePence < 0 ? "down" : "up"} ${formatPence(Math.abs(offer.priceChangePence))} since the last check`;
  return `${change}${offer.thirtyDayLow ? ", lowest in 30 days" : ""}`;
}

// The whole cell is the link, through /go/[offerId] to that exact product on the pharmacy's site.
// Its text reads in full for screen readers, since the visible cell is just numbers and marks.
function PriceCell({ offer, valuePence, lowest, pricing, anyPack, placement, rank, partner, short = false, layout }: PriceCellProps) {
  const { variant } = offer;
  const code = codeSavingPence(offer, pricing.codes) > 0 ? offer.discounts.find((discount) => discount.id === offer.codeDiscountId) : undefined;
  const price = `${formatPence(valuePence)}${pricing.mode === "tablet" ? " per tablet" : ""}`;
  return (
    <OutboundLink
      offerId={offer.id}
      placement={placement}
      partner={partner}
      rank={rank}
      layout={layout}
      className={cn(
        "flex h-full min-h-20 flex-col items-end justify-center gap-0.5 rounded-xl border border-transparent px-3 py-2 text-right transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring",
        lowest && "border-primary/40 bg-primary/10 hover:bg-primary/15",
      )}
    >
      <span aria-hidden="true" className="text-base font-semibold tabular-nums sm:text-lg">
        {formatPence(valuePence)}{offer.feesVerified ? null : "*"}
      </span>
      <span aria-hidden="true" className="text-xs text-muted-foreground tabular-nums">{secondaryLine(offer, pricing, anyPack, short)}</span>
      {code ? <span aria-hidden="true" className="text-xs font-medium">with {code.code ?? "offer"}</span> : null}
      <span aria-hidden="true" className="mt-0.5 flex flex-wrap items-center justify-end gap-1.5">
        {offer.priceChangePence !== null ? <PriceChange pence={offer.priceChangePence} /> : null}
        {offer.thirtyDayLow ? <span className="rounded-full border border-border px-1.5 py-px text-[0.6875rem] font-medium">30-day low</span> : null}
        {lowest ? <span className="rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground">Lowest</span> : null}
      </span>
      <span className="sr-only">
        {offer.providerName}, {variantProductName(variant)} {variant.strengthMg}mg × {variant.packQuantity}, {price}
        {code ? `, with ${code.code ? `code ${code.code}` : "the pharmacy's offer"} (${code.eligibility})` : ""}
        {offer.feesVerified ? "" : ", indicative: fees not yet verified"}{lowest ? ", lowest in this column" : ""}{movementText(offer)}, opens {offer.providerDomain} in a new tab
      </span>
    </OutboundLink>
  );
}

function NotOnSale({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex min-h-20 flex-col items-end justify-center px-3 py-2 text-right text-xs text-muted-foreground">
      <span className="font-medium">{title}</span>
      <span>{note}</span>
    </div>
  );
}

const notOnSale = {
  "out-of-stock": <NotOnSale title="Out of stock" note="Not ranked" />,
  "not-sold": <NotOnSale title="–" note="Not stocked" />,
};

// "Not stocked" never guesses from a neighbouring pack: it says plainly the pharmacy doesn't list it.
export function PriceGridCell({ cell, ...context }: { cell: GridCell } & CellContext) {
  if (cell.kind === "price") return <PriceCell offer={cell.offer} valuePence={cell.valuePence} lowest={cell.lowest} {...context} />;
  return notOnSale[cell.kind];
}
