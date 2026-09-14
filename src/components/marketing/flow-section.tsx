import { Badge } from "@/components/ui/badge";
import { WaveDivider } from "@/components/marketing/wave-divider";

const FLOW = [
  {
    label: "Searches",
    items: ["medicine name", "dosage", "generic", "brand"],
    offset: "lg:mt-24",
  },
  {
    label: "Compares",
    items: ["price", "pharmacy", "distance", "delivery"],
    offset: "lg:mt-16",
  },
  {
    label: "Verifies",
    items: ["license", "authenticity", "batch", "expiry"],
    offset: "lg:mt-8",
  },
  {
    label: "Secures",
    items: ["coverage", "discount", "checkout", "tracking"],
    offset: "lg:mt-0",
  },
];

export function FlowSection() {
  return (
    <section className="px-6 pb-8 pt-24">
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary" className="rounded-full px-3 py-1">
          One Search, Full Picture
        </Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          One search, every answer.{" "}
          <span className="bg-gradient-to-r from-[var(--chart-1)] via-[var(--chart-2)] to-[var(--chart-5)] bg-clip-text text-transparent">
            Confidence that compounds.
          </span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          PharmaCompare surfaces price, stock, authenticity and coverage
          exactly when you need them.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-4">
        {FLOW.map(({ label, items, offset }) => (
          <div key={label} className={offset}>
            <p className="text-sm font-medium">{label}</p>
            <ul className="mt-4 space-y-3 border-l border-primary/40 pl-4 text-sm text-muted-foreground">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-5xl">
        <WaveDivider />
      </div>
    </section>
  );
}
