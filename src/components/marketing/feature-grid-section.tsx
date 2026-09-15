import { CircleDot, ScanSearch, ShieldCheck, Truck } from "lucide-react";

const FEATURES = [
  {
    icon: ScanSearch,
    label: "Search",
    heading: "Find UK pharmacies offering ED treatment.",
    bullets: ["Manual listings first", "Reviewed discovery imports"],
  },
  {
    icon: CircleDot,
    label: "Compare",
    heading: "Compare matching ED offers side by side.",
    bullets: ["Sildenafil & tadalafil", "Pack and total-cost comparisons"],
  },
  {
    icon: ShieldCheck,
    label: "Verify",
    heading: "See the evidence behind each listing.",
    bullets: ["Registration source links", "Clearly labelled checked dates"],
  },
  {
    icon: Truck,
    label: "Continue",
    heading: "Continue to the pharmacy for assessment.",
    bullets: ["Pharmacy consultation", "Purchase on the provider’s site"],
  },
];

export function FeatureGridSection() {
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          The planned journey,{" "}
          <span className="bg-gradient-to-r from-[var(--chart-1)] via-[var(--chart-2)] to-[var(--chart-5)] bg-clip-text text-transparent">
            from discovery to comparison.
          </span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          These features are coming soon. Our initial catalogue will focus on
          sildenafil and tadalafil for ED treatment.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, label, heading, bullets }) => (
          <div
            key={label}
            className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-(--shadow)"
          >
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Icon className="size-3.5 text-primary" />
              {label}
            </span>
            <h3 className="mt-8 text-lg font-semibold">{heading}</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
