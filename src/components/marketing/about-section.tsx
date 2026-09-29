import { ArrowRight, Ban, Eye, Scale } from "lucide-react";
import Image from "next/image";

import Link from "@/components/Link";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";

// Mirrors the commitments on the Independence page — keep the two in step.
const VALUES = [
  { icon: Scale, title: "Ranked by price only", body: "The lowest verified total comes first. Nothing else moves a pharmacy up or down." },
  { icon: Ban, title: "Inclusion isn't for sale", body: "Pharmacies are listed free after our checks and can't pay to be listed, hidden or reordered." },
  { icon: Eye, title: "Open about money", body: "Every link that could earn us commission is labelled, and we name every partner." },
];

export function AboutSection() {
  return (
    <section id="about" aria-labelledby="about-heading" className="scroll-mt-28 px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative order-last lg:order-first">
          <div className="group relative aspect-square overflow-hidden rounded-[2rem] border border-border shadow-2xl shadow-foreground/10">
            <Image src="/images/summer-and-colin.jpg" alt="A smiling couple outdoors" fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none" />
          </div>
          <div className="absolute -right-3 -bottom-6 max-w-60 rounded-2xl border border-border bg-card/90 p-4 shadow-xl backdrop-blur sm:-right-8">
            <p className="text-sm font-semibold">Built for clarity</p>
            <p className="mt-1 text-xs text-muted-foreground">A discreet, independent starting point before you speak to a pharmacist.</p>
          </div>
        </Reveal>

        <div>
          <SectionHeading
            id="about-heading"
            align="left"
            eyebrow="About us"
            title="An independent guide to"
            accent="ED pharmacies in the UK."
            description="We started because comparing ED treatment online was harder than it should be. Pack sizes differ, fees appear at checkout and it isn't always clear who you're buying from. We check each pharmacy's registration, read prices from its own website and show the total cost, so you can make a calm, informed choice."
          />
          <ul className="mt-10 space-y-4">
            {VALUES.map(({ icon: Icon, title, body }, index) => (
              <li key={title}>
                <Reveal delay={index * 100}>
                  <div className="group flex gap-4 rounded-2xl p-3 transition-colors duration-300 hover:bg-muted/60">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
            <Link href="/ed/trust/about" className="group inline-flex items-center gap-1.5 underline-offset-4 hover:underline">More about us<ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" /></Link>
            <Link href="/ed/independence" className="group inline-flex items-center gap-1.5 underline-offset-4 hover:underline">How we stay independent<ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
