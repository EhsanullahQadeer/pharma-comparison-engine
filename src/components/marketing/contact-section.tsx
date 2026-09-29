import { ArrowRight, CircleAlert, MessageSquareText, Store } from "lucide-react";

import { ContactForm } from "@/components/ed/public-forms";
import Link from "@/components/Link";
import { Reveal } from "@/components/marketing/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";
import { hoverCardClass } from "@/lib/motion";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  { icon: MessageSquareText, title: "Spotted a wrong price?", body: "Send it straight to our review queue.", href: "/ed/pharmacies/claim", label: "Request a correction" },
  { icon: Store, title: "Know a pharmacy we've missed?", body: "We'll check its registration and ED service.", href: "/ed/pharmacies/submit", label: "Suggest a pharmacy" },
];

export function ContactSection() {
  return (
    <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-28 px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
        <div>
          <SectionHeading
            id="contact-heading"
            align="left"
            eyebrow="Contact us"
            title="Questions? Get in touch,"
            accent="we read everything."
            description="Questions about the site, a listing, or your pharmacy. We reply by email."
          />

          <div className="mt-10 space-y-4">
            {SHORTCUTS.map(({ icon: Icon, title, body, href, label }, index) => (
              <Reveal key={href} delay={index * 100}>
                <Link href={href} className={cn(hoverCardClass, "flex items-start gap-4 rounded-2xl p-5 focus-visible:outline-2 focus-visible:outline-ring")}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 transition-transform duration-300 group-hover:scale-110"><Icon aria-hidden="true" className="size-5" /></span>
                  <span className="flex-1">
                    <span className="block font-semibold">{title}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium transition-all group-hover:gap-2">{label}<ArrowRight aria-hidden="true" className="size-4" /></span>
                  </span>
                </Link>
              </Reveal>
            ))}
            <Reveal delay={200}>
              <div role="note" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
                <p className="flex items-center gap-2 font-semibold"><CircleAlert aria-hidden="true" className="size-4 text-destructive" />We can&apos;t give medical advice</p>
                <p className="mt-1.5 text-muted-foreground">For health questions, speak to a pharmacist or your GP, or call NHS 111. In an emergency, call 999.</p>
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal delay={120}>
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}
