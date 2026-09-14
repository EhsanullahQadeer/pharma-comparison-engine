import Image from "next/image";
import { Badge } from "@/components/ui/badge";

const TESTIMONIALS = [
  {
    name: "Dean & Allie",
    image: "/images/dean-and-allie.jpg",
    quote:
      "We compared five pharmacies in two minutes and saved $40 on a refill. Wish we'd found this sooner.",
  },
  {
    name: "Summer & Colin",
    image: "/images/summer-and-colin.jpg",
    quote:
      "Knowing the pharmacy was verified gave us peace of mind ordering online for the first time.",
  },
  {
    name: "Jordan M.",
    image: "/images/download.jpg",
    quote:
      "Simple, fast, and the price match was spot on. It's now our go-to before every pickup.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary" className="rounded-full px-3 py-1">
          Real Patients, Real Savings
        </Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Loved by families{" "}
          <span className="bg-gradient-to-r from-[var(--chart-1)] via-[var(--chart-2)] to-[var(--chart-5)] bg-clip-text text-transparent">
            managing their health.
          </span>
        </h2>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-3">
        {TESTIMONIALS.map(({ name, image, quote }) => (
          <figure
            key={name}
            className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-(--shadow)"
          >
            <div className="relative size-16 overflow-hidden rounded-full ring-2 ring-primary/20">
              <Image
                src={image}
                alt={name}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <blockquote className="mt-5 text-sm text-muted-foreground">
              &ldquo;{quote}&rdquo;
            </blockquote>
            <figcaption className="mt-4 text-sm font-medium">
              {name}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
