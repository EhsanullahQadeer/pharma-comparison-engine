import { CircleAlert } from "lucide-react";

import { GradientText } from "@/components/ed/gradient-text";
import { PageShell } from "@/components/ed/page-shell";
import { ContactForm } from "@/components/ed/public-forms";
import Link from "@/components/Link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact the ED comparison team",
  description: "Questions, listing corrections and pharmacy enquiries. We can't give medical advice, so for health concerns contact a pharmacist, your GP or NHS 111.",
  alternates: { canonical: "/ed/contact" },
};

export default function ContactPage() {
  return (
    <PageShell
      title="Contact us"
      heading={<>Get in touch, <GradientText>we read everything.</GradientText></>}
      eyebrow="Trust / About and support"
      description="Questions about the site, a listing, or your pharmacy. We reply by email."
      crumbs={[{ label: "Home", href: "/" }]}
    >
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <ContactForm />
        <aside className="space-y-5">
          <div className="rounded-3xl border border-border bg-card p-5 text-sm">
            <p className="flex items-center gap-2 font-semibold"><CircleAlert aria-hidden="true" className="size-4 text-destructive" />We can&apos;t give medical advice</p>
            <p className="mt-2 leading-relaxed text-muted-foreground">For health questions, speak to a pharmacist or your GP, or call NHS 111. In an emergency, call 999.</p>
          </div>
          <div className="rounded-3xl border border-border p-5 text-sm">
            <p className="font-semibold">Wrong price or detail?</p>
            <p className="mt-2 text-muted-foreground">The correction form sends it straight to our review queue.</p>
            <Link href="/ed/pharmacies/claim" className="mt-3 inline-block font-medium underline underline-offset-4">Request a correction</Link>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
