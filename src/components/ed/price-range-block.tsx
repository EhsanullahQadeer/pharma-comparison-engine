import { formatPence } from "@/lib/money";
import { gridColumnLabel } from "@/lib/price-grid";
import type { PriceGrid } from "@/types/comparison";

function Figure({ label, pence }: { label: string; pence: number | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{pence === null ? "–" : formatPence(pence)}</dd>
    </div>
  );
}

// "Price range by strength": lowest / median / highest over exactly the in-stock prices in the
// grid below (summaries come from the same cells), so the two can never disagree.
export function PriceRangeBlock({ grid }: { grid: PriceGrid }) {
  const scope = grid.pack === "any" ? "any pack" : `pack of ${grid.pack}`;
  const mode = grid.mode === "total" ? "pack total" : "per tablet";
  const sorted = grid.summaries.find((summary) => summary.column === grid.sortColumn);
  return (
    <section aria-labelledby="price-range-heading" className="mt-6">
      <h2 id="price-range-heading" className="sr-only">Price range by {grid.axis === "strength" ? "strength" : "pack size"}</h2>
      {/* Phones: one line for the ranked column instead of a stack of cards. */}
      {sorted && sorted.pharmacyCount > 0 ? (
        <p className="text-sm text-muted-foreground tabular-nums sm:hidden">
          <span className="font-medium text-foreground">{gridColumnLabel(grid.axis, sorted.column)}{grid.axis === "strength" ? `, ${scope}` : ""}:</span>{" "}
          lowest {formatPence(sorted.lowestPence ?? 0)} · median {formatPence(sorted.medianPence ?? 0)} · highest {formatPence(sorted.highestPence ?? 0)}
        </p>
      ) : null}
      <ul className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
        {grid.summaries.map((summary) => (
          <li key={summary.column} className="rounded-2xl border border-border bg-card p-4 shadow-(--shadow)">
            <p className="text-sm font-medium">
              {gridColumnLabel(grid.axis, summary.column)}{grid.axis === "strength" ? ` · ${scope}` : ""} · {mode}
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              <Figure label="Lowest" pence={summary.lowestPence} />
              <Figure label="Median" pence={summary.medianPence} />
              <Figure label="Highest" pence={summary.highestPence} />
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">{summary.pharmacyCount} pharmac{summary.pharmacyCount === 1 ? "y" : "ies"} in stock</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
