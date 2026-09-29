import { ArrowUpRight, ExternalLink, Scale, ScanSearch, ShieldCheck } from "lucide-react";

import Link from "@/components/Link";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { hoverCardClass } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: ScanSearch, title: "Search", body: "Pick sildenafil or tadalafil, then the strength and pack size you're after.", href: "/ed/compare" },
  { icon: Scale, title: "Compare", body: "See each pharmacy's total cost, with delivery and consultation fees added in, plus price per tablet.", href: "/ed/compare" },
  { icon: ShieldCheck, title: "Verify", body: "Check the pharmacy's registration evidence and when we last confirmed its price.", href: "/ed/pharmacies/verification" },
  { icon: ExternalLink, title: "Continue", body: "Go to the pharmacy you choose for its own consultation. Purchases happen on its site.", href: "/ed/how-it-works" },
];

export function FeatureGridSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="scroll-mt-28 px-4 py-24 sm:px-6 lg:py-32">
      <SectionHeading
        id="how-it-works-heading"
        eyebrow="How it works"
        title="Four steps to a"
        accent="clearer choice."
        description="We bring registration evidence and verified prices together. The clinical assessment and your purchase stay with the pharmacy."
      />

      <div className="relative mx-auto mt-16 max-w-6xl">
        <div aria-hidden="true" className="absolute top-12 right-[12%] left-[12%] hidden h-px bg-linear-to-r from-transparent via-primary/50 to-transparent lg:block" />
        <ol className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, body, href }, index) => (
          <li key={title}>
            <Reveal delay={index * 100} className="h-full">
              <Link href={href} className={cn(hoverCardClass, "flex flex-col p-6 focus-visible:outline-2 focus-visible:outline-ring")}>
                <div className="flex items-center justify-between">
                  <span className="relative flex size-12 items-center justify-center rounded-2xl bg-primary/15 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary">
                    <Icon aria-hidden="true" className="size-5 text-foreground transition-colors group-hover:text-primary-foreground" />
                  </span>
                  <span aria-hidden="true" className="text-4xl font-semibold text-muted-foreground tabular-nums transition-colors group-hover:text-foreground">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium transition-all group-hover:gap-2">
                  Learn more<ArrowUpRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
        </ol>
      </div>
    </section>
  );
}
