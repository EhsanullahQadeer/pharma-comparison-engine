import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <span className="mb-6 inline-block text-sm font-medium text-primary">
            Transparent Pricing, Every Time
          </span>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Compare medicines and save with confidence.
          </h1>
          <p className="mt-6 max-w-lg text-muted-foreground">
            PharmaCompare helps patients, caregivers and pharmacists find the
            best medicine prices across verified pharmacies. Compare
            instantly, without the guesswork.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="rounded-full px-6"
              nativeButton={false}
              render={<Link href="#get-started">Compare Now</Link>}
            />
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-6"
              nativeButton={false}
              render={<Link href="#how-it-works">See how it works</Link>}
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
              alt="A couple confidently managing their medicine costs with PharmaCompare"
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
