import { Clock3, PoundSterling, SearchCheck, Store } from "lucide-react";

import { Reveal } from "@/components/marketing/reveal";

import type { LucideIcon } from "lucide-react";

type Stat = { icon: LucideIcon; value: string; label: string };

// Real directory numbers only; a count that is still zero is left out rather than shown as "0".
export function StatsBand({ found, published }: { found: number; published: number }) {
  const stats: Stat[] = [
    ...(found > 0 ? [{ icon: SearchCheck, value: found.toLocaleString("en-GB"), label: "pharmacies checked against UK registers" }] : []),
    ...(published > 0 ? [{ icon: Store, value: published.toLocaleString("en-GB"), label: "pharmacies listed after staff review" }] : []),
    { icon: Clock3, value: "24h", label: "before a price is marked “may have changed”" },
    { icon: PoundSterling, value: "£0", label: "to use, with no sign-up needed" },
  ];

  return (
    <section aria-label="Directory in numbers" className="px-4 sm:px-6">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border shadow-(--shadow) lg:grid-cols-4">
        {stats.map(({ icon: Icon, value, label }, index) => (
          <Reveal key={label} delay={index * 80} className="h-full bg-card">
            <div className="group flex h-full flex-col gap-3 p-6 transition-colors duration-300 hover:bg-muted/60 sm:p-8">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Icon aria-hidden="true" className="size-5 text-foreground" />
              </span>
              <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
