import { Check, X } from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { hoverCardClass } from "@/lib/motion";
import { cn } from "@/lib/utils";

const PAIN_POINTS = [
  "Comparing different pack sizes can hide the actual cost",
  "An advertised price may exclude delivery or consultation",
  "Introductory discounts may not apply to repeat purchases",
  "A directory entry alone does not explain its registration evidence",
  "Outdated offers can make a comparison misleading",
];

const BENEFITS = [
  "Matches medicine, strength and pack quantity",
  "Adds known charges to show the total cost",
  "Separates one-off prices from repeat prices",
  "Links to registration evidence and checked dates",
  "Labels prices checked more than 24 hours ago",
];

const COLUMNS = [
  { title: "Shopping around alone", icon: X, items: PAIN_POINTS, highlighted: false },
  { title: "With our comparison", icon: Check, items: BENEFITS, highlighted: true },
];

export function ComparisonSection() {
  return (
    <section aria-labelledby="why-us-heading" className="bg-muted/40 px-4 py-24 sm:px-6 lg:py-32">
      <SectionHeading id="why-us-heading" eyebrow="Why compare with us" title="More context for ED prices." accent="That's what we do." />

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
        {COLUMNS.map(({ title, icon: Icon, items, highlighted }, column) => (
          <Reveal key={title} delay={column * 120} className="h-full">
            <div className={cn(hoverCardClass, "p-6 sm:p-8", highlighted && "border-primary/40 bg-linear-to-br from-primary/10 via-card to-card")}>
              <h3 className="flex items-center gap-3 text-lg font-semibold">
                <span className={cn("flex size-9 items-center justify-center rounded-full", highlighted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                {title}
              </h3>
              <ul className="mt-6 space-y-3">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 p-3.5 text-sm transition-colors duration-200 hover:bg-background">
                    <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", highlighted ? "text-primary" : "text-muted-foreground")} />
                    <span className={highlighted ? undefined : "text-muted-foreground"}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
