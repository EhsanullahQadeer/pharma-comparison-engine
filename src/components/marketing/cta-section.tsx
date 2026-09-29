import { ArrowRight } from "lucide-react";

import { Button } from "@/components/common/button";
import Link from "@/components/Link";
import { Reveal } from "@/components/marketing/reveal";

export function CtaSection() {
  return (
    <section aria-labelledby="cta-heading" className="px-4 pb-24 sm:px-6">
      <Reveal className="mx-auto max-w-6xl">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-sidebar-rail px-6 py-16 text-center text-sidebar-rail-foreground shadow-2xl sm:px-12 lg:py-20">
          <div aria-hidden="true" className="absolute -top-24 left-1/2 -z-10 size-96 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl motion-safe:animate-float" />
          <div aria-hidden="true" className="absolute -right-20 -bottom-32 -z-10 size-80 rounded-full bg-chart-2/25 blur-3xl motion-safe:animate-float [animation-delay:-5s]" />
          <h2 id="cta-heading" className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Ready to see what your treatment really costs?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sidebar-rail-foreground/75">
            Compare verified sildenafil and tadalafil prices from registered UK pharmacies. Free, discreet, no sign-up.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="group h-12 rounded-full px-7 text-base shadow-lg shadow-primary/30"
              nativeButton={false}
              render={<Link href="/ed/compare">Compare prices now<ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" /></Link>}
            />
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-sidebar-rail-foreground/30 bg-transparent px-7 text-base text-sidebar-rail-foreground hover:bg-sidebar-rail-foreground/10 hover:text-sidebar-rail-foreground"
              nativeButton={false}
              render={<Link href="/ed/guides">Read our guides</Link>}
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}
