import { ShieldCheck } from "lucide-react";

const strong = "font-semibold text-foreground";

// Each mark the grid uses, shown the way it appears in a cell, next to what it means.
const keyItems: { term: React.ReactNode; text: string }[] = [
  { term: <span className="rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground">Lowest</span>, text: "Cheapest in-stock price in that column." },
  { term: <span className={strong}>↓ 20p / ↑ 10p</span>, text: "Fallen or risen since the previous check." },
  { term: <span className={strong}>30-day low</span>, text: "Its lowest price in the last 30 days." },
  { term: <span className={strong}>*</span>, text: "Indicative: the pharmacy's delivery or consultation fees are not yet verified. Indicative prices rank after verified ones." },
  { term: <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">Checked</span>, text: "When the pharmacy's prices were last read from its own site; after 24 hours a price may have changed." },
  { term: <span className={strong}>–</span>, text: "Not stocked: the pharmacy doesn't list this strength in this pack size." },
  { term: <span className={strong}>Out of stock</span>, text: "Listed but unavailable, so not ranked." },
  { term: <span className={strong}>GPhC</span>, text: "The pharmacy's registration number, linked to the regulator's register." },
  { term: <span className={strong}>Dispensed by</span>, text: "The pharmacy that supplies the medicine, which is why some share a number." },
  { term: <span className={strong}>Pharmacy facts</span>, text: "GPhC inspection, “Next day” and “Discreet packaging” are recorded by our team from the register and the pharmacy's own site; a pharmacy without them just hasn't been recorded yet." },
  { term: <span className={strong}>Trustpilot</span>, text: "Links to the pharmacy's own Trustpilot page." },
];

const formulas = [
  { term: "Pack total", text: "= medicine + delivery + any consultation or other compulsory fee" },
  { term: "Per tablet", text: "= pack total ÷ tablets" },
];

const box = "rounded-xl border border-border bg-card p-5";

// The table key under the grid: every label, mark and abbreviation the cells use, how the prices
// are worked out, and the one thing a cheaper price is not a reason for.
export function PriceGridKey() {
  return (
    <section aria-labelledby="grid-key-heading" className="mt-8 grid items-start gap-4 text-sm text-muted-foreground lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className={box}>
        <h2 id="grid-key-heading" className="font-semibold text-foreground">Table key</h2>
        {/* Newspaper columns, so a long entry doesn't leave a gap beside it. */}
        <dl className="mt-4 gap-x-8 md:columns-2">
          {keyItems.map((item) => (
            <div key={item.text} className="mb-3 grid break-inside-avoid grid-cols-[7rem_minmax(0,1fr)] items-baseline gap-3">
              <dt>{item.term}</dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="grid gap-4">
        <div className={box}>
          <h2 className="font-semibold text-foreground">How prices are worked out</h2>
          <dl className="mt-4 space-y-2">
            {formulas.map((formula) => (
              <div key={formula.term} className="rounded-lg bg-muted px-3 py-2">
                <dt className={strong}>{formula.term}</dt>
                <dd>{formula.text}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-3 list-disc space-y-1.5 pl-4 marker:text-muted-foreground">
            <li>&ldquo;Medicine only&rdquo; leaves delivery and fees out.</li>
            <li>&ldquo;With code&rdquo; takes off only the single best discount code, from the medicine price; check who each code is for in the Current offer column.</li>
            <li>Pharmacies are ranked by price only; partners never move up.</li>
          </ul>
        </div>
        <div className="flex gap-3 rounded-xl border border-border bg-secondary p-5 text-secondary-foreground">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="font-semibold">Before you buy</h2>
            <p className="mt-1">Each pharmacy&apos;s own prescriber or pharmacist decides whether a treatment is suitable for you. A lower price per tablet is not a reason to choose a different strength.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
