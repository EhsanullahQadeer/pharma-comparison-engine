import Image from "next/image";

import { Button } from "@/components/common/button";
import Link from "@/components/Link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <span className="mb-6 inline-block text-sm font-medium text-primary">
            UK ED treatment · Platform preview
          </span>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            A clearer way to explore ED pharmacies.
          </h1>
          <p className="mt-6 max-w-lg text-muted-foreground">
            We’re building a UK pharmacy directory for erectile dysfunction
            treatment. Pharmacy listings come first, followed by clear sildenafil
            and tadalafil price comparisons and reviewed guides.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="rounded-full px-6"
              nativeButton={false}
              render={<Link href="/ed/pharmacies">Explore the directory plan</Link>}
            />
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-6"
              nativeButton={false}
              render={<Link href="/ed/roadmap">See build progress</Link>}
            />
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 scale-125 rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, var(--chart-1) 0%, var(--chart-2) 45%, transparent 70%)",
            }}
          />
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-3xl border border-border shadow-(--shadow)">
            <Image
              src="/images/download.jpg"
              alt="A couple sitting together"
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
