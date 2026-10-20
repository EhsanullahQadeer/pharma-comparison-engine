import { ContentSection, PointList } from "@/components/ed/content-blocks";
import { PageShell } from "@/components/ed/page-shell";
import Link from "@/components/Link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal information this ED price comparison site collects, why, how long it's kept and your rights.",
  alternates: { canonical: "/ed/privacy" },
};

// Describes what the public site actually does today: no accounts, third-party analytics, advertising or
// tracking cookies. "View" clicks are counted server-side with coarse, non-identifying detail (area,
// device, browser, page clicked from, price shown) and never the IP or raw user agent
// (/go/[offerId], M7); the only personal data kept is what someone types into the site's forms.
export default function PrivacyPage() {
  return (
    <PageShell title="Privacy policy" eyebrow="Trust / Policies" description="You can compare prices and read every page on this site without giving us any personal information." crumbs={[{ label: "Home", href: "/" }]}>
      <ContentSection id="browsing" title="When you browse">
        <PointList points={[
          "There are no accounts, no advertising and no third-party analytics or tracking tools on the public site.",
          "We don't set cookies for visitors. The only thing saved in your browser is your light or dark theme choice, and it never leaves your device.",
          "Fonts and images are served from our own site, not from third parties.",
          "When you choose “View”, we count the click (which pharmacy and product, and which of our pages and price positions it came from), then send you straight to the pharmacy's own website. This shows us which prices people find useful.",
          "With that count we keep a few general details that don't identify you: the approximate area you were in (country, region and town or city), whether you used a phone, tablet or computer, the name of your browser and system, the page of ours you clicked from with any filters you had chosen, and the price you were shown.",
          "We don't store your IP address. It's used for a moment to work out the approximate area and is then discarded. To filter out automated traffic, we keep a scrambled code made from your connection details that changes every day, and delete it within 24 hours.",
        ]} />
      </ContentSection>
      <ContentSection id="forms" title="When you use one of our forms">
        <PointList points={[
          "Suggest a pharmacy: the pharmacy's name, website and registration number, your message and, if you give it, your email address.",
          "Report a correction: the details you report and, if you give it, your email address.",
          "Contact us: your email address, your topic and message, and your name if you give it.",
          "We use this only to review your suggestion or correction and to reply to you. We never sell it or use it for marketing.",
          "To stop spam, your IP address is checked against a short-term limit held in memory. It isn't saved.",
          "Please don't include health details in a form. We can't give medical advice, and we don't need them.",
        ]} />
      </ContentSection>
      <ContentSection id="price-alerts" title="Price alerts">
        <PointList points={[
          "If you set up a price alert we keep your email address, the product, strength and pack you chose, and your target price. Nothing else.",
          "We first email you a link to confirm. Until you confirm we send nothing else, and if you don't confirm within 48 hours we delete your address.",
          "Once confirmed, we email you when the cheapest listed price reaches your target, at most once a day. We use your address for nothing else.",
          "Every alert email has a link to stop the alert. Stopping it deletes your address and the alert straight away. Alerts end automatically after a year.",
          "Our lawful basis for alerts is your consent, which you give by confirming and can withdraw at any time by stopping the alert.",
          "Alert emails are sent through our email provider, which handles your address only to deliver them.",
        ]} />
      </ContentSection>
      <ContentSection id="retention" title="Who sees it and how long we keep it">
        <PointList points={[
          "Only our staff, who sign in to a separate, restricted admin area, can see form messages.",
          "We keep a message while we deal with it and for our records afterwards. Ask us and we'll delete yours.",
          "Our lawful basis is legitimate interest: running and correcting a public price comparison, understanding which prices people use, and answering people who contact us.",
        ]} />
      </ContentSection>
      <ContentSection id="rights" title="Your rights">
        <PointList points={[
          "Under UK data protection law you can ask for a copy of the information we hold about you, and ask us to correct or delete it.",
          "You can object to how we use it.",
          "You can complain to the Information Commissioner's Office (ico.org.uk).",
        ]} />
        <p className="mt-6 text-sm text-muted-foreground">To make a request, use our <Link href="/ed/contact" className="underline underline-offset-4">contact form</Link> and say it&apos;s about privacy.</p>
      </ContentSection>
      <ContentSection id="pharmacies" title="Pharmacies you visit">
        <PointList points={[
          "Consultations, orders and payments happen on the pharmacy's own website, under its own privacy policy.",
          "We never see or receive the health information you give a pharmacy.",
        ]} />
      </ContentSection>
    </PageShell>
  );
}
