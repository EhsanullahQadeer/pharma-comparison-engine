import { ContentSection } from "@/components/ed/content-blocks";
import type { InfoCard } from "@/components/ed/content-blocks";
import Link from "@/components/Link";
import type { PartnerProvider } from "@/types/referrals";

import type { LucideIcon } from "lucide-react";

// Public disclosure of our commercial relationships, built from the same list that decides which
// links are labelled as earning (getPartnerProviders), so the wording can't drift from what the site does.

export function partnerCard(partners: PartnerProvider[], icon: LucideIcon): InfoCard {
  const count = partners.length;
  return count > 0
    ? { icon, title: "Partner pharmacies", body: `We have a commercial relationship with ${count} pharmac${count === 1 ? "y" : "ies"}, listed below. We may earn commission if you buy through our link to them.` }
    : { icon, title: "No partners today", body: "We have no referral, commission or advertising agreements with any pharmacy we list." };
}

export function PartnerList({ partners }: { partners: PartnerProvider[] }) {
  return (
    <ContentSection
      id="partners"
      title="Our partner pharmacies"
      intro="We link to every pharmacy we list. These are the only ones whose links can earn us money; a link to any other pharmacy earns us nothing."
    >
      {partners.length > 0 ? (
        <ul className="mt-6 flex flex-wrap gap-3">
          {partners.map((partner) => (
            <li key={partner.id}>
              <Link href={`/ed/pharmacies/${partner.slug}`} className="inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary/50">{partner.name}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-muted-foreground">None at the moment, so no link on our pages earns us money.</p>
      )}
    </ContentSection>
  );
}
