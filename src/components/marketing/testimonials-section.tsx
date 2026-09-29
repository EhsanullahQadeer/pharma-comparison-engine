import { Info, Quote } from "lucide-react";
import Image from "next/image";

import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { hoverCardClass } from "@/lib/motion";
import { cn } from "@/lib/utils";

// No real user reviews have been collected yet, so these are illustrative and the section says so
// on the page (fake reviews are unlawful in the UK and break SEO rule 6). Replace them with genuine,
// consented feedback and set SAMPLE_TESTIMONIALS to false before launch. Never add star ratings.
const SAMPLE_TESTIMONIALS = true;

const TESTIMONIALS = [
  {
    quote: "I'd been comparing prices in three tabs and still missed the delivery charge. Seeing the total cost side by side made the decision easy.",
    name: "James",
    detail: "Leeds",
    image: "/images/dean-and-allie.jpg",
  },
  {
    quote: "Being able to check the pharmacy's registration before going anywhere near a checkout gave me real peace of mind.",
    name: "Colin",
    detail: "Bristol",
    image: "/images/summer-and-colin.jpg",
  },
  {
    quote: "Clear, discreet and no sign-up. I found a tadalafil pack for less than I'd been paying, and the price matched on the pharmacy's site.",
    name: "Mark",
    detail: "Glasgow",
    image: "/images/download.jpg",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" aria-labelledby="testimonials-heading" className="relative scroll-mt-28 overflow-hidden bg-muted/40 px-4 py-24 sm:px-6 lg:py-32">
      <SectionHeading id="testimonials-heading" eyebrow="Testimonials" title="What people value about" accent="comparing with us." />

      {SAMPLE_TESTIMONIALS ? (
        <p className="mx-auto mt-6 flex w-fit max-w-full items-center gap-2 rounded-full border border-dashed border-border bg-background px-4 py-1.5 text-xs text-muted-foreground">
          <Info aria-hidden="true" className="size-3.5 shrink-0" />
          Illustrative examples while we collect genuine feedback.
        </p>
      ) : null}

      <ul className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
        {TESTIMONIALS.map(({ quote, name, detail, image }, index) => (
          <li key={name}>
            <Reveal delay={index * 120} className="h-full">
              <figure className={cn(hoverCardClass, "flex flex-col p-7", index === 1 && "md:-translate-y-4 md:hover:-translate-y-5")}>
                <Quote aria-hidden="true" className="size-8 text-primary/50 transition-all duration-300 group-hover:scale-110 group-hover:text-primary" />
                <blockquote className="mt-5 flex-1 leading-relaxed text-pretty">&ldquo;{quote}&rdquo;</blockquote>
                <figcaption className="mt-8 flex items-center gap-3 border-t border-border pt-5">
                  <span className="relative size-11 overflow-hidden rounded-full ring-2 ring-primary/30 transition-all duration-300 group-hover:ring-primary">
                    <Image src={image} alt="" fill sizes="44px" className="object-cover" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{name}</span>
                    <span className="block text-xs text-muted-foreground">{detail}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
