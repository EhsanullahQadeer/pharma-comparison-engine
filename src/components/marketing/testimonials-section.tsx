import Image from "next/image";

import { Badge } from "@/components/common/badge";

const PRIORITIES = [
  {
    name: "A discreet starting point",
    image: "/images/dean-and-allie.jpg",
    quote:
      "Explore ED pharmacy information and prepare questions for a professional consultation.",
  },
  {
    name: "Evidence you can inspect",
    image: "/images/summer-and-colin.jpg",
    quote:
      "Understand where listing details come from and when registration evidence was checked.",
  },
  {
    name: "Costs with context",
    image: "/images/download.jpg",
    quote:
      "See pack sizes, delivery fees and offer conditions together when price comparison launches.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary" className="rounded-full px-3 py-1">
          What we’re designing for
        </Badge>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          A thoughtful approach to{" "}
          <span className="bg-linear-to-r from-chart-1 via-chart-2 to-chart-5 bg-clip-text text-transparent">
            ED treatment information.
          </span>
        </h2>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-3">
        {PRIORITIES.map(({ name, image, quote }) => (
          <div
            key={name}
            className="flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-(--shadow)"
          >
            <div className="relative size-16 overflow-hidden rounded-full ring-2 ring-primary/20">
              <Image
                src={image}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <h3 className="mt-4 text-sm font-medium">
              {name}
            </h3>
            <p className="mt-5 text-sm text-muted-foreground">{quote}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
