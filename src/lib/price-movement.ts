// Price movement for one offer from its recorded checks (PriceHistory), compared on medicine +
// delivery — the part each check actually reads. Pure; the query that feeds it is in
// getPublicOffers.

import type { PriceHistoryAggregate, PricePoint } from "@/types/comparison";

export const MOVEMENT_WINDOW_DAYS = 30;
// How far back the sparklines on a pharmacy's page go.
export const HISTORY_DAYS = 90;

export function priceMovement(currentPence: number, { recentPence, low30Pence, high30Pence }: PriceHistoryAggregate) {
  // The latest check normally records the current price; if the offer has moved on since (an edit
  // with no snapshot), the latest check is itself the previous price.
  const previous = recentPence[0] === currentPence ? recentPence[1] : recentPence[0];
  const change = previous === undefined ? 0 : currentPence - previous;
  return {
    priceChangePence: change === 0 ? null : change,
    thirtyDayLow: low30Pence !== null && high30Pence !== null && high30Pence > currentPence && currentPence <= low30Pence,
  };
}

// A sparkline only says something when the price actually moved.
export function priceMoved(points: PricePoint[]) {
  return new Set(points.map((point) => point.pence)).size > 1;
}

// SVG coordinates for a sparkline in a width × height box (inset by `pad` so the end marker and
// stroke aren't clipped). Time runs left to right by date, not by point index, so a gap between
// checks shows as a longer flat line. Pure, so the geometry is unit-tested.
export function sparklineGeometry(points: PricePoint[], width: number, height: number, pad = 4) {
  const times = points.map((point) => point.day.getTime());
  const values = points.map((point) => point.pence);
  const [t0, t1] = [Math.min(...times), Math.max(...times)];
  const [low, high] = [Math.min(...values), Math.max(...values)];
  const x = (time: number) => pad + (t1 === t0 ? (width - 2 * pad) / 2 : ((time - t0) / (t1 - t0)) * (width - 2 * pad));
  const y = (pence: number) => pad + (high === low ? (height - 2 * pad) / 2 : (1 - (pence - low) / (high - low)) * (height - 2 * pad));
  const coords = points.map((point) => ({ x: x(point.day.getTime()), y: y(point.pence), point }));
  // A step line: a price holds until the next check changes it.
  const path = coords.map((c, index) => (index === 0 ? `M${c.x.toFixed(1)},${c.y.toFixed(1)}` : `H${c.x.toFixed(1)}V${c.y.toFixed(1)}`)).join("");
  return { coords, path, low, high };
}
