import { freshnessTier, isRankable, perTabletPence } from "@/lib/comparison";
import { inspectionPassed } from "@/lib/provider-labels";
import type { ComparisonFilters, GridCell, GridFilterFlags, GridColumnAxis, GridPack, GridPriceMode, PriceGrid, PriceGridColumnSummary, PriceGridOptions, PriceGridRow, PublicDiscount, PublicOffer } from "@/types/comparison";

// Pure: the shopper's grid for ONE product's offers (callers narrow with productOffers, so brand
// and generic are never mixed). Every figure the page shows — lowest labels, the range block, the
// "last checked" date — is derived from the cells built here, so they can't disagree.

function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b);
}

export type GridPricing = { mode: GridPriceMode; fees: boolean; codes: boolean };

// What a discount code saves on this offer, when the shopper has asked to see code prices.
export function codeSavingPence(offer: PublicOffer, codes: boolean) {
  return codes && offer.discountedTotalPence !== null ? offer.deliveredTotalPence - offer.discountedTotalPence : 0;
}

// Pack total or price per tablet, with or without delivery and other fees, and with or without
// the best discount code. Integer pence.
export function gridValuePence(offer: PublicOffer, { mode, fees, codes }: GridPricing) {
  const total = (fees ? offer.deliveredTotalPence : offer.itemPricePence) - codeSavingPence(offer, codes);
  return mode === "tablet" ? perTabletPence(total, offer.variant.packQuantity) : total;
}

// The drawer's filters, applied to offers before the grid is built: a pharmacy left with nothing
// that passes drops out, and a cell whose offer fails reads "Not stocked" for this view. "Free
// delivery" needs verified fees — an unverified zero may just be a fee the page didn't show.
const offerFilters: Record<keyof GridFilterFlags, (offer: PublicOffer) => boolean> = {
  inStock: (offer) => offer.availability !== "OUT_OF_STOCK",
  freeDelivery: (offer) => offer.feesVerified && offer.deliveryFeePence === 0,
  noConsultation: (offer) => offer.consultationFeePence === 0,
  verifiedOnly: (offer) => offer.feesVerified,
  hasDiscount: (offer) => offer.discounts.length > 0,
  // Pharmacy facts: only a recorded "yes" passes — an unrecorded fact is unknown, not a match.
  nextDay: (offer) => offer.providerFacts.nextDayDelivery === true,
  discreet: (offer) => offer.providerFacts.discreetPackaging === true,
  inspectionPassed: (offer) => offer.providerFacts.inspectionOutcome !== null && inspectionPassed[offer.providerFacts.inspectionOutcome],
};

type GridFilterInput = GridFilterFlags & Pick<ComparisonFilters, "purchaseModel" | "region" | "payment" | "minTrustpilot">;

function matchesChoices(offer: PublicOffer, { purchaseModel, region, payment, minTrustpilot }: GridFilterInput) {
  const facts = offer.providerFacts;
  return (
    (!purchaseModel || offer.purchaseModel === purchaseModel) &&
    (!region || facts.serviceRegions.some((served) => served.trim().toLowerCase() === region.toLowerCase())) &&
    (!payment || facts.paymentMethods.includes(payment)) &&
    // A hidden score (scores switched off) is null, so this filter then matches nothing; the
    // drawer doesn't offer it in that case.
    (!minTrustpilot || (facts.trustpilotScoreTenths !== null && facts.trustpilotScoreTenths >= minTrustpilot))
  );
}

export function filterGridOffers(offers: PublicOffer[], filters: GridFilterInput) {
  const active = (Object.keys(offerFilters) as (keyof GridFilterFlags)[]).filter((key) => filters[key]);
  return offers.filter((offer) => matchesChoices(offer, filters) && active.every((key) => offerFilters[key](offer)));
}

// How many drawer filters are narrowing the grid (flags plus the four choices).
export function activeGridFilterCount(filters: ComparisonFilters) {
  return Object.values(gridFilterFlags(filters)).filter(Boolean).length + [filters.purchaseModel, filters.region, filters.payment, filters.minTrustpilot].filter(Boolean).length;
}

export function gridFiltered(filters: ComparisonFilters) {
  return activeGridFilterCount(filters) > 0;
}

// One product's grid exactly as the URL describes it, filters included.
export function gridFromFilters(offers: PublicOffer[], filters: ComparisonFilters, now: Date) {
  return buildPriceGrid(filterGridOffers(offers, filters), gridOptionsFromFilters(filters), now);
}

// The pack listed by the most pharmacies; a tie goes to the smaller pack.
export function defaultPack(offers: PublicOffer[]) {
  const providers = new Map<number, Set<string>>();
  for (const offer of offers) providers.set(offer.variant.packQuantity, (providers.get(offer.variant.packQuantity) ?? new Set()).add(offer.providerId));
  return [...providers.entries()].sort((a, b) => b[1].size - a[1].size || a[0] - b[0])[0]?.[0] ?? null;
}

function resolvePack(offers: PublicOffer[], packs: number[], pack: GridPack | undefined, mode: GridPriceMode): GridPack | null {
  if (pack === "any" && mode === "tablet") return "any";
  return typeof pack === "number" && packs.includes(pack) ? pack : defaultPack(offers);
}

// Same order as the list's compareOffers: verified fees first, then price, then neutral ids — so
// equal prices never reorder between identical requests and partner status never plays a part.
function compareByValue(value: (offer: PublicOffer) => number) {
  return (a: PublicOffer, b: PublicOffer) =>
    Number(b.feesVerified) - Number(a.feesVerified) ||
    value(a) - value(b) ||
    a.deliveredTotalPence - b.deliveredTotalPence ||
    a.providerId.localeCompare(b.providerId) ||
    a.id.localeCompare(b.id);
}

// One pharmacy's offers for one cell (several when it lists another form or a subscription of the
// same pack): an in-stock one wins, then the lowest value.
function pickCell(candidates: PublicOffer[], value: (offer: PublicOffer) => number): GridCell {
  if (candidates.length === 0) return { kind: "not-sold" };
  const [best] = [...candidates].sort((a, b) => Number(isRankable(b)) - Number(isRankable(a)) || value(a) - value(b) || a.id.localeCompare(b.id));
  return isRankable(best) ? { kind: "price", offer: best, valuePence: value(best), lowest: false } : { kind: "out-of-stock", offer: best };
}

function median(sorted: number[]) {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function priceCells(rows: PriceGridRow[], index: number) {
  return rows.flatMap((row) => {
    const cell = row.cells[index];
    return cell.kind === "price" ? [cell] : [];
  });
}

// Lowest / median / highest over the in-stock prices actually in the grid's column.
export function summarizeGridColumns(columns: number[], rows: PriceGridRow[]): PriceGridColumnSummary[] {
  return columns.map((column, index) => {
    const values = priceCells(rows, index).map((cell) => cell.valuePence).sort((a, b) => a - b);
    return {
      column,
      lowestPence: values[0] ?? null,
      medianPence: values.length > 0 ? median(values) : null,
      highestPence: values.at(-1) ?? null,
      pharmacyCount: values.length,
    };
  });
}

// A row's discounts, de-duplicated, with the one "With code" applies to most of its prices first —
// so the Current offer column names the code behind the prices on screen.
function dedupeDiscounts(offers: PublicOffer[]): PublicDiscount[] {
  const applied = new Map<string, number>();
  for (const offer of offers) if (offer.codeDiscountId) applied.set(offer.codeDiscountId, (applied.get(offer.codeDiscountId) ?? 0) + 1);
  const unique = [...new Map(offers.flatMap((offer) => offer.discounts).map((discount) => [discount.id, discount])).values()];
  return unique.sort((a, b) => (applied.get(b.id) ?? 0) - (applied.get(a.id) ?? 0));
}

function cellOffer(cell: GridCell) {
  return cell.kind === "not-sold" ? [] : [cell.offer];
}

function latestCheck(offers: PublicOffer[]) {
  return offers.length > 0 ? new Date(Math.max(...offers.map((offer) => offer.checkedAt.getTime()))) : null;
}

export function buildPriceGrid(offers: PublicOffer[], { pack: requestedPack, mode, fees, column, query, codes = false }: PriceGridOptions, now: Date): PriceGrid {
  const strengths = uniqueSorted(offers.map((offer) => offer.variant.strengthMg));
  // A single-strength product (Viagra Connect, Cialis Together) compares its pack sizes instead.
  const axis: GridColumnAxis = strengths.length === 1 ? "pack" : "strength";
  const packs = axis === "strength" ? uniqueSorted(offers.map((offer) => offer.variant.packQuantity)) : [];
  const pack = axis === "strength" ? resolvePack(offers, packs, requestedPack, mode) : null;
  const value = (offer: PublicOffer) => gridValuePence(offer, { mode, fees, codes });

  const inView = axis === "strength" && typeof pack === "number" ? offers.filter((offer) => offer.variant.packQuantity === pack) : offers;
  const columnOf = (offer: PublicOffer) => (axis === "strength" ? offer.variant.strengthMg : offer.variant.packQuantity);
  const columns = uniqueSorted(inView.map(columnOf));

  const search = query?.trim().toLowerCase();
  const byProvider = new Map<string, PublicOffer[]>();
  for (const offer of inView) {
    if (search && !offer.providerName.toLowerCase().includes(search)) continue;
    byProvider.set(offer.providerId, [...(byProvider.get(offer.providerId) ?? []), offer]);
  }

  const unsortedRows: PriceGridRow[] = [...byProvider.values()].map((providerOffers) => {
    const cells = columns.map((key) => pickCell(providerOffers.filter((offer) => columnOf(offer) === key), value));
    const shown = cells.flatMap(cellOffer);
    // Every row holds at least one offer, so it always has a check date.
    const checkedAt = latestCheck(shown) as Date;
    const [first] = providerOffers;
    return {
      providerId: first.providerId,
      providerName: first.providerName,
      providerSlug: first.providerSlug,
      providerLogoUrl: first.providerLogoUrl,
      providerRegulatorType: first.providerRegulatorType,
      providerRegulatorReference: first.providerRegulatorReference,
      providerDispensingPartnerName: first.providerDispensingPartnerName,
      providerFacts: first.providerFacts,
      checkedAt,
      freshness: freshnessTier(checkedAt, now),
      discounts: dedupeDiscounts(shown),
      cells,
    };
  });

  // Rank by the requested column, else the one with the most prices (ties → first column).
  const counts = columns.map((_, index) => priceCells(unsortedRows, index).length);
  const busiest = counts.indexOf(Math.max(...counts));
  const sortIndex = column !== undefined && columns.includes(column) ? columns.indexOf(column) : busiest;
  const sortColumn = columns[sortIndex] ?? null;
  const rankBy = compareByValue(value);

  // Pharmacies with an in-stock price in the ranked column first, by price; the rest after, by name.
  const sorted = [...unsortedRows].sort((a, b) => {
    const cellA = a.cells[sortIndex];
    const cellB = b.cells[sortIndex];
    if (cellA?.kind === "price" && cellB?.kind === "price") return rankBy(cellA.offer, cellB.offer);
    if (cellA?.kind === "price") return -1;
    if (cellB?.kind === "price") return 1;
    return a.providerName.localeCompare(b.providerName) || a.providerId.localeCompare(b.providerId);
  });

  const summaries = summarizeGridColumns(columns, sorted);
  // "Lowest" marks every cell equal to its column's lowest (a tie is never hidden), and only
  // where several pharmacies actually compete.
  const rows = sorted.map((row) => ({
    ...row,
    cells: row.cells.map((cell, index): GridCell => (cell.kind === "price" ? { ...cell, lowest: summaries[index].pharmacyCount > 1 && cell.valuePence === summaries[index].lowestPence } : cell)),
  }));

  return { axis, columns, packs, pack, mode, fees, codes, sortColumn, rows, summaries, latestCheckedAt: latestCheck(gridOffers(rows)) };
}

// The offers whose prices are on screen — for anything else on the page that counts or dates them.
export function gridOffers(rows: PriceGridRow[]) {
  return rows.flatMap((row) => row.cells.flatMap(cellOffer));
}

const columnLabels: Record<GridColumnAxis, (column: number) => string> = {
  strength: (column) => `${column}mg`,
  pack: (column) => `${column} tablet${column === 1 ? "" : "s"}`,
};

export function gridColumnLabel(axis: GridColumnAxis, column: number) {
  return columnLabels[axis](column);
}

const modeLabels: Record<GridPriceMode, string> = { total: "pack total", tablet: "price per tablet" };

// "Generic sildenafil · pack of 8 · pack total incl. delivery & fees": the table's caption and the
// line above it, stating exactly what the numbers are.
export function gridDescription(grid: PriceGrid, productName: string) {
  const packText: Record<GridColumnAxis, string> = { strength: grid.pack === "any" ? "any pack size" : `pack of ${grid.pack}`, pack: "by pack size" };
  const sortText = grid.sortColumn === null ? "" : ` · sorted by ${gridColumnLabel(grid.axis, grid.sortColumn)}, cheapest first`;
  return `${productName} · ${packText[grid.axis]} · ${modeLabels[grid.mode]} ${grid.fees ? "incl. delivery & fees" : "medicine only"}${grid.codes ? ", with discount codes" : ""}${sortText}`;
}

// The grid's options as the URL states them. A link that names a strength (a variant card's
// "Compare") ranks by that strength's column.
export function gridOptionsFromFilters({ anyPack, packQuantity, mode = "total", medicineOnly, column, strengthMg, query, codes }: ComparisonFilters): PriceGridOptions {
  return { pack: anyPack ? "any" : packQuantity, mode, fees: !medicineOnly, column: column ?? strengthMg, query, codes };
}

export function gridFilterFlags({ inStock, freeDelivery, noConsultation, verifiedOnly, hasDiscount, nextDay, discreet, inspectionPassed: passed }: ComparisonFilters): GridFilterFlags {
  return { inStock, freeDelivery, noConsultation, verifiedOnly, hasDiscount, nextDay, discreet, inspectionPassed: passed };
}

// The URL state a grid's own links carry forward (product and list-only filters excluded).
export function gridState(filters: ComparisonFilters): Partial<ComparisonFilters> {
  const { anyPack, packQuantity, mode, medicineOnly, column, strengthMg, query, codes, purchaseModel, layout, region, payment, minTrustpilot } = filters;
  return { anyPack, packQuantity, mode, medicineOnly, column: column ?? strengthMg, query, codes, purchaseModel, layout, region, payment, minTrustpilot, ...gridFilterFlags(filters) };
}
