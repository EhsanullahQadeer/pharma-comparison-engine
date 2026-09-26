import { Check, X } from "lucide-react";

import { Badge } from "@/components/common/badge";

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
  "Labels older prices and explains update schedules",
];

function ComparisonRing() {
  return (
    <div className="relative mx-auto flex size-56 items-center justify-center">
      <div
        className="absolute inset-0 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, var(--chart-1) 0%, var(--chart-2) 60%, transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, var(--chart-1), var(--chart-2), var(--chart-5), var(--chart-1))",
          mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
          WebkitMask:
            "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
        }}
      />
      <div className="absolute inset-8 rounded-full border border-dashed border-border" />
      <div className="size-3 rounded-full bg-primary" />
    </div>
  );
}

export function ComparisonSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary" className="rounded-full px-3 py-1">
          Clarity
        </Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          More context for ED prices.{" "}
          <span className="bg-linear-to-r from-chart-1 via-chart-2 to-chart-5 bg-clip-text text-transparent">
            That’s what we do.
          </span>
        </h2>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_auto_1fr]">
        <ul className="space-y-3">
          {PAIN_POINTS.map((point) => (
            <li
              key={point}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm"
            >
              <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>

        <ComparisonRing />

        <ul className="space-y-3">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
