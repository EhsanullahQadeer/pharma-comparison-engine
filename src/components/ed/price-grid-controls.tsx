import Link from "@/components/Link";
import { cn } from "@/lib/utils";
import type { ComparisonFilters, PriceGrid } from "@/types/comparison";

export type GridProductTab = { slug: string; label: string; group: string; href: string; active: boolean };
type HrefFor = (patch: Partial<ComparisonFilters>) => string;

// Buttons in the search/filter row: the same 36px pill as the search box and quick-filter chips.
export const toolbarButton = "h-9 gap-1.5 rounded-full px-4 text-sm";

const chip = "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring";
const chipStyles = {
  on: "border-primary bg-primary text-primary-foreground",
  off: "border-border bg-background hover:border-primary/50 hover:bg-muted",
};

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} scroll={false} aria-current={active ? "true" : undefined} className={cn(chip, chipStyles[active ? "on" : "off"])}>
      {children}
    </Link>
  );
}

// Two-way switch drawn as one pill, each half a link (the state lives in the URL).
export function Segmented({ label, options }: { label: string; options: { label: string; href: string; active: boolean }[] }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl bg-muted p-1">
      {options.map((option) => (
        <Link
          key={option.label}
          href={option.href}
          scroll={false}
          aria-current={option.active ? "true" : undefined}
          className={cn("rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring", option.active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

// Product tabs, grouped by medicine — brand and generic are never mixed in one grid.
export function GridProductTabs({ tabs }: { tabs: GridProductTab[] }) {
  const groups = [...new Set(tabs.map((tab) => tab.group))];
  return (
    <nav aria-label="Product" className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
      {groups.map((group) => (
        <div key={group}>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group}</p>
          <ul className="flex flex-wrap gap-2">
            {tabs.filter((tab) => tab.group === group).map((tab) => (
              <li key={tab.slug}>
                <Link
                  href={tab.href}
                  scroll={false}
                  aria-current={tab.active ? "page" : undefined}
                  className={cn("inline-flex rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring", tab.active ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-primary/50")}
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// Price mode, pack size and fees: the always-visible controls above the grid. Changing pack or
// mode keeps the ranked column only if it still exists, which buildPriceGrid checks.
export function PriceGridControls({ grid, href, hasCodes }: { grid: PriceGrid; href: HrefFor; hasCodes: boolean }) {
  const anyPack = grid.pack === "any";
  return (
    <section aria-label="Grid options" className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-3xl border border-border bg-card/80 p-4 shadow-(--shadow) sm:p-5">
      <Segmented
        label="Price shown"
        options={[
          // A pack total needs one pack size, so leaving per-tablet mode drops "Any pack".
          { label: "Pack total", href: href({ mode: "total", anyPack: false }), active: grid.mode === "total" },
          { label: "Per tablet", href: href({ mode: "tablet" }), active: grid.mode === "tablet" },
        ]}
      />
      {grid.axis === "strength" && grid.packs.length > 0 ? (
        <div role="group" aria-label="Pack size" className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-medium">Pack size</span>
          {grid.packs.map((pack) => (
            <Chip key={pack} href={href({ packQuantity: pack, anyPack: false })} active={grid.pack === pack}>{pack} tablet{pack === 1 ? "" : "s"}</Chip>
          ))}
          {grid.mode === "tablet" ? <Chip href={href({ anyPack: true })} active={anyPack}>Any pack</Chip> : null}
        </div>
      ) : null}
      <Segmented
        label="Fees"
        options={[
          { label: "With delivery & fees", href: href({ medicineOnly: false }), active: grid.fees },
          { label: "Medicine only", href: href({ medicineOnly: true }), active: !grid.fees },
        ]}
      />
      {/* Standard price ranks by default; code prices are opt-in and only for who each code covers. */}
      {hasCodes ? (
        <Segmented
          label="Discount codes"
          options={[
            { label: "Standard price", href: href({ codes: false }), active: !grid.codes },
            { label: "With code", href: href({ codes: true }), active: grid.codes },
          ]}
        />
      ) : null}
    </section>
  );
}
