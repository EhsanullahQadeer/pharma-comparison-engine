import { Calculator, ChevronDown, Clock3, Scale, Stethoscope } from "lucide-react";

const NOTES = [
  {
    icon: Calculator,
    title: "How the total is worked out",
    body: "Total = medicine price + delivery + consultation + any other fee the pharmacy requires. Price per tablet is that total divided by the number of tablets in the pack. A fee marked “Not listed” wasn’t shown on the pharmacy’s page and hasn’t been verified yet, so the total is indicative.",
  },
  {
    icon: Clock3,
    title: "How fresh the prices are",
    body: "Each price is read from the pharmacy’s own website and shows when it was last checked. Prices checked 24–48 hours ago are still ranked by price but marked “may have changed”, and older prices are hidden until they’re checked again.",
  },
  {
    icon: Scale,
    title: "How the ranking works",
    body: "Offers are ordered by price alone: lowest first, with totals whose fees are verified ahead of indicative ones. No pharmacy can pay to be listed or to change its position.",
  },
  {
    icon: Stethoscope,
    title: "What this comparison isn’t",
    body: "It isn’t medical advice or a recommendation. Prescription ED treatment needs a consultation with the pharmacy’s prescriber, who decides whether it’s suitable for you. Always confirm the final price at the pharmacy’s checkout.",
  },
];

export function PricingNotes() {
  return (
    <section aria-labelledby="pricing-notes-heading" className="mt-16">
      <h2 id="pricing-notes-heading" className="text-2xl font-semibold">How we compare prices</h2>
      <div className="mt-5 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
        {NOTES.map(({ icon: Icon, title, body }) => (
          <details key={title} className="group p-5 transition-colors open:bg-background/60 sm:px-6">
            <summary className="flex cursor-pointer list-none items-center gap-3 font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15"><Icon aria-hidden="true" className="size-4" /></span>
              <span className="flex-1">{title}</span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <p className="mt-3 pl-11 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
