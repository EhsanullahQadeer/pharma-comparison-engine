import { formatPence } from "@/lib/money";
import { sparklineGeometry } from "@/lib/price-movement";
import type { PricePoint } from "@/types/comparison";

const WIDTH = 160;
const HEIGHT = 40;
const dayFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

// A single-series step line of one price over time: ink-coloured (it carries no identity, so it
// needs no hue), with the latest price ringed in the surface colour. Each day has a hover target
// larger than the mark, and the whole chart is described in words for screen readers.
export function PriceSparkline({ points, label }: { points: PricePoint[]; label: string }) {
  const { coords, path, low, high } = sparklineGeometry(points, WIDTH, HEIGHT);
  const last = coords.at(-1);
  const step = coords.length > 1 ? (WIDTH - 8) / (coords.length - 1) : WIDTH;
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${label}: ${formatPence(points[0].pence)} on ${dayFormatter.format(points[0].day)}, now ${formatPence(last?.point.pence ?? 0)}; lowest ${formatPence(low)}, highest ${formatPence(high)}`} className="h-10 w-40 overflow-visible text-foreground">
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {last ? <circle cx={last.x} cy={last.y} r={4} className="fill-foreground stroke-card" strokeWidth={2} /> : null}
      {coords.map((c) => (
        <rect key={c.point.day.toISOString()} x={c.x - step / 2} y={0} width={Math.max(step, 8)} height={HEIGHT} fill="transparent">
          <title>{`${dayFormatter.format(c.point.day)}: ${formatPence(c.point.pence)}`}</title>
        </rect>
      ))}
    </svg>
  );
}
