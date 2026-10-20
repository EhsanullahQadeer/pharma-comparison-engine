// The table key under the grid: every label, mark and abbreviation the cells use, how the prices
// are worked out, and the one thing a cheaper price is not a reason for.
export function PriceGridKey() {
  return (
    <section aria-labelledby="grid-key-heading" className="mt-8 grid gap-8 text-sm text-muted-foreground md:grid-cols-3">
      <div>
        <h2 id="grid-key-heading" className="font-semibold text-foreground">Table key</h2>
        <ul className="mt-2 space-y-1.5">
          <li><span className="mr-1.5 rounded-full bg-primary px-2 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground">Lowest</span>cheapest in-stock price in that column</li>
          <li><span className="font-semibold text-foreground">↓ 20p / ↑ 10p</span> fallen or risen since the previous check · <span className="font-semibold text-foreground">30-day low</span> its lowest in 30 days</li>
          <li><span className="font-semibold text-foreground">*</span> indicative: the pharmacy&apos;s delivery or consultation fees are not yet verified. Indicative prices rank after verified ones.</li>
          <li>&ldquo;Checked&rdquo; shows when the pharmacy&apos;s prices were last read from its own site; after 24 hours a price may have changed.</li>
          <li><span className="font-semibold text-foreground">–</span> Not stocked: the pharmacy doesn&apos;t list this strength in this pack size.</li>
          <li>Out of stock: listed but unavailable, so not ranked.</li>
          <li>GPhC: the pharmacy&apos;s registration number, linked to the regulator&apos;s register. &ldquo;Dispensed by&rdquo; names the pharmacy that supplies the medicine, which is why some share a number.</li>
          <li>GPhC inspection, &ldquo;Next day&rdquo; and &ldquo;Discreet packaging&rdquo; are facts our team recorded from the register and the pharmacy&apos;s own site; a pharmacy without them just hasn&apos;t been recorded yet. Trustpilot links to the pharmacy&apos;s own Trustpilot page.</li>
        </ul>
      </div>
      <div>
        <h2 className="font-semibold text-foreground">How prices are worked out</h2>
        <p className="mt-2">Pack total = medicine + delivery + any consultation or other compulsory fee. Per tablet = pack total ÷ tablets. &ldquo;Medicine only&rdquo; leaves delivery and fees out. Discount codes are only taken off when you choose &ldquo;With code&rdquo;, and then only the single best code, off the medicine price; check who each code is for in the Current offer column. Pharmacies are ranked by price only; partners never move up.</p>
      </div>
      <div>
        <h2 className="font-semibold text-foreground">Before you buy</h2>
        <p className="mt-2">Each pharmacy&apos;s own prescriber or pharmacist decides whether a treatment is suitable for you. A lower price per tablet is not a reason to choose a different strength.</p>
      </div>
    </section>
  );
}
