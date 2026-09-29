import { ArrowRight, BadgeCheck, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/common/button";
import { GradientText } from "@/components/ed/gradient-text";
import Link from "@/components/Link";

const TRUST_POINTS = [
  { icon: ShieldCheck, label: "Registered UK pharmacies" },
  { icon: ReceiptText, label: "Delivery & fees included" },
  { icon: BadgeCheck, label: "Ranked by price only" },
];

type HeroStats = { published: number; livePrices: number };

export function HeroSection({ stats }: { stats: HeroStats }) {
  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden px-4 pt-14 pb-20 sm:px-6 lg:pt-20 lg:pb-28">
      {/* Soft animated brand glows + a faint grid, purely decorative. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 size-120 rounded-full bg-chart-1/20 blur-3xl motion-safe:animate-float" />
        <div className="absolute top-40 -right-24 size-104 rounded-full bg-chart-2/20 blur-3xl motion-safe:animate-float [animation-delay:-7s]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[56px_56px] opacity-40 mask-[radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="motion-safe:animate-fade-up">
          <Link href="/ed/how-it-works" className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/80 py-1 pr-3 pl-1 text-xs font-medium shadow-(--shadow) backdrop-blur transition-colors hover:border-primary/50">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground"><Sparkles aria-hidden="true" className="size-3" />New</span>
            Independent UK ED price comparison
            <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <h1 id="hero-heading" className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Compare ED treatment prices, <GradientText>the whole cost included.</GradientText>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-pretty text-muted-foreground">
            Sildenafil and tadalafil from registered UK pharmacies, side by side, with delivery and consultation fees added in, so the price you see is the price you pay.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="group h-12 rounded-full px-7 text-base shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
              nativeButton={false}
              render={<Link href="/ed/compare">Compare prices<ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" /></Link>}
            />
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full px-7 text-base"
              nativeButton={false}
              render={<Link href="/ed/pharmacies">Browse pharmacies</Link>}
            />
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon aria-hidden="true" className="size-4 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md motion-safe:animate-fade-up [animation-delay:150ms] lg:max-w-none">
          <div className="relative aspect-4/5 overflow-hidden rounded-[2rem] border border-border shadow-2xl shadow-foreground/10">
            <Image src="/images/download.jpg" alt="A couple relaxing together at home" fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" priority />
            <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-foreground/40 via-transparent to-transparent" />
          </div>

          {stats.livePrices > 0 ? (
            <div className="absolute -bottom-6 -left-4 w-56 rounded-2xl border border-border bg-card/90 p-4 shadow-xl backdrop-blur sm:-left-10">
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="relative flex size-2">
                  <span aria-hidden="true" className="absolute inline-flex size-full rounded-full bg-primary opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                Live prices
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.livePrices}</p>
              <p className="text-xs text-muted-foreground">checked in the last 48 hours</p>
            </div>
          ) : null}

          {stats.published > 0 ? (
            <div className="absolute top-8 -right-3 flex items-center gap-3 rounded-2xl border border-border bg-card/90 p-3 pr-4 shadow-xl backdrop-blur sm:-right-8">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15"><ShieldCheck aria-hidden="true" className="size-5 text-primary" /></span>
              <div>
                <p className="text-lg leading-none font-semibold tabular-nums">{stats.published}</p>
                <p className="mt-1 text-xs text-muted-foreground">checked pharmacies</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
