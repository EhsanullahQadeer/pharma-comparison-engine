import { Badge } from "@/components/common/badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { FreshnessPill } from "@/components/ed/freshness-pill";
import { OutboundLink } from "@/components/ed/outbound-link";
import { SalePill, saleText } from "@/components/ed/was-price";
import { freshnessTier, offerAnchor, slugify, subscriptionTerms, variantLabel } from "@/lib/comparison";
import { formatPence } from "@/lib/money";
import { priceCellKey } from "@/lib/pharmacy-page";
import { cn } from "@/lib/utils";
import type { PublicOffer } from "@/types/comparison";
import type { PharmacyPageModel, ProfilePriceGrid } from "@/types/pharmacy-page";

// One product's prices at this pharmacy: strengths across, pack sizes down, like the comparison
// grid. Each price is a counted link (/go) to that exact product on the pharmacy's site, and carries
// the #offer-<id> anchor the comparison grid links to (HashHighlight outlines it on arrival).

export const productGridId = (grid: ProfilePriceGrid) => `product-${slugify(grid.key)}`;

function PriceLink({ offer, best, model }: { offer: PublicOffer; best: boolean; model: PharmacyPageModel }) {
  const soldOut = offer.availability === "OUT_OF_STOCK";
  const terms = subscriptionTerms(offer);
  return (
    <OutboundLink
      offer={offer}
      placement="PHARMACY_PROFILE"
      partner={model.partner}
      id={offerAnchor(offer.id)}
      className={cn(
        "flex scroll-mt-28 flex-col items-end gap-0.5 rounded-lg px-2.5 py-2 text-right ring-primary/40 transition-colors hover:bg-primary/5 hover:ring-1 focus-visible:outline-2 focus-visible:outline-ring data-highlighted:bg-primary/10 data-highlighted:ring-2 data-highlighted:ring-primary",
        best && "bg-primary/10",
        soldOut && "opacity-60",
      )}
    >
      <span aria-hidden="true" className="font-semibold tabular-nums">{formatPence(offer.deliveredTotalPence)}{offer.feesVerified ? null : "*"}</span>
      <span aria-hidden="true" className="text-xs text-muted-foreground tabular-nums">{formatPence(offer.perTabletPence)}/tablet</span>
      {soldOut ? <span aria-hidden="true" className="text-xs font-medium">Out of stock</span> : null}
      {terms ? <span aria-hidden="true" className="text-xs font-medium">{terms.short}</span> : null}
      {best || offer.wasPricePence !== null ? (
        <span aria-hidden="true" className="flex flex-wrap justify-end gap-1">
          {offer.wasPricePence !== null ? <SalePill /> : null}
          {best ? <span className="rounded-full bg-primary px-1.5 py-px text-[0.6875rem] font-semibold text-primary-foreground">Best value</span> : null}
        </span>
      ) : null}
      <span className="sr-only">
        {variantLabel(offer.variant)}: {formatPence(offer.deliveredTotalPence)} in total, {formatPence(offer.perTabletPence)} per tablet
        {offer.feesVerified ? "" : ", indicative: fees not yet verified"}{soldOut ? ", out of stock" : ""}{best ? ", best value per tablet" : ""}{saleText(offer)}{terms ? `, ${terms.full}` : ""}. Opens {offer.providerDomain} in a new tab
      </span>
    </OutboundLink>
  );
}

export function ProductPriceGrid({ grid, model }: { grid: ProfilePriceGrid; model: PharmacyPageModel }) {
  const id = productGridId(grid);
  const title = `${grid.product}${grid.formNote ? ` · ${grid.formNote}` : ""}`;
  return (
    <section aria-labelledby={`${id}-heading`} id={id} className="scroll-mt-28 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 id={`${id}-heading`} className="flex flex-wrap items-center gap-2 font-semibold">
          {title}
          {grid.subscription ? <Badge variant="secondary">Subscription</Badge> : null}
        </h3>
        <FreshnessPill freshness={freshnessTier(grid.latestCheckAt, model.now)} checkedAt={grid.latestCheckAt} now={model.now} compact />
      </div>
      <Table resizable={false} stickyHeader={false} frameClassName="rounded-none border-0 bg-transparent">
        <TableCaption className="sr-only">{title} prices at {model.provider.name}, by pack size and strength</TableCaption>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead scope="col" className="h-9 w-28 text-xs">Pack</TableHead>
            {grid.strengths.map((strength) => <TableHead key={strength} scope="col" className="h-9 text-right text-xs">{strength}mg</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {grid.packs.map((pack) => (
            <TableRow key={pack} className="hover:bg-transparent">
              <TableHead scope="row" className="text-sm font-medium text-foreground">{pack} tablet{pack === 1 ? "" : "s"}</TableHead>
              {grid.strengths.map((strength) => {
                const offers = grid.cells[priceCellKey(strength, pack)];
                return (
                  <TableCell key={strength} className="p-1 align-top">
                    {offers ? (
                      <div className="flex flex-col gap-1">
                        {offers.map((offer) => <PriceLink key={offer.id} offer={offer} best={offer.id === grid.bestValueOfferId} model={model} />)}
                      </div>
                    ) : (
                      <span className="flex justify-end px-2.5 py-2 text-muted-foreground"><span aria-hidden="true">–</span><span className="sr-only">Not sold</span></span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
