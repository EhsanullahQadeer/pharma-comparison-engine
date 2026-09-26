import { ContentSection, PointList } from "@/components/ed/content-blocks";
import { GradientText } from "@/components/ed/gradient-text";
import { PackCostCalculator } from "@/components/ed/pack-cost-calculator";
import { PageShell } from "@/components/ed/page-shell";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ED pack-cost calculator — total and price per tablet",
  description: "Work out the total cost and price per tablet of an ED treatment pack, including delivery and consultation fees, and compare two packs side by side.",
  alternates: { canonical: "/ed/tools/pack-cost" },
};

export default function PackCostPage() {
  return (
    <PageShell
      title="Pack-cost calculator"
      heading={<>What a pack <GradientText>really costs.</GradientText></>}
      eyebrow="Tools / Prepare a comparison"
      description="Enter two packs to see the total you'd pay and the price per tablet, with delivery and consultation fees included. Nothing you type is saved or sent anywhere."
      crumbs={[{ label: "Home", href: "/" }, { label: "Tools", href: "/ed/tools" }]}
    >
      <PackCostCalculator />
      <ContentSection id="notes" title="Before you decide">
        <PointList points={[
          "This is arithmetic only. It doesn't know whether a medicine, strength or pack is right for you. Your prescriber decides that.",
          "Check whether the consultation fee applies to every order or only the first.",
          "Compare packs of the same medicine and strength for a fair per-tablet comparison.",
        ]} />
      </ContentSection>
    </PageShell>
  );
}
