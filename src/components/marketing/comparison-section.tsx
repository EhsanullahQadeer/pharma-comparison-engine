import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PAIN_POINTS = [
  "Prices vary wildly between pharmacies with no easy way to compare",
  "Hours lost calling around just to find one medicine in stock",
  "Unclear which generics are actually equivalent to brand names",
  "No way to confirm a pharmacy is licensed before you order",
  "Insurance and discount coverage buried in confusing fine print",
];

const BENEFITS = [
  "Real-time price comparison across every nearby and online pharmacy",
  "Instant stock lookup so you know before you call or drive",
  "Clear generic-equivalence labels backed by pharmacist review",
  "Every pharmacy verified and licensed before it appears in results",
  "Insurance and discount eligibility shown upfront, no surprises",
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
          Stop overpaying at the counter.{" "}
          <span className="bg-gradient-to-r from-[var(--chart-1)] via-[var(--chart-2)] to-[var(--chart-5)] bg-clip-text text-transparent">
            Buy with confidence.
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
