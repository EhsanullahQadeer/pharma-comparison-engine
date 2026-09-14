import { CircleDot, ScanSearch, ShieldCheck, Truck } from "lucide-react";

const FEATURES = [
  {
    icon: ScanSearch,
    label: "Search",
    heading: "Find every option without digging through tabs.",
    bullets: ["Nationwide pharmacy index", "Generic & brand matches"],
  },
  {
    icon: CircleDot,
    label: "Compare",
    heading: "See real prices side by side, instantly.",
    bullets: ["Live price tracking", "Dosage-accurate comparisons"],
  },
  {
    icon: ShieldCheck,
    label: "Verify",
    heading: "Confirm authenticity before you buy.",
    bullets: ["Licensed pharmacy checks", "Batch & expiry validation"],
  },
  {
    icon: Truck,
    label: "Order",
    heading: "Get your medicine with complete confidence.",
    bullets: ["One-click checkout", "Delivery tracking included"],
  },
];

export function FeatureGridSection() {
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Trusted by patients and pharmacies{" "}
          <span className="bg-gradient-to-r from-[var(--chart-1)] via-[var(--chart-2)] to-[var(--chart-5)] bg-clip-text text-transparent">
            from search to savings.
          </span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          Built for clarity in a confusing market. Comparing 10,000+
          medicines across verified pharmacy partners.
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
