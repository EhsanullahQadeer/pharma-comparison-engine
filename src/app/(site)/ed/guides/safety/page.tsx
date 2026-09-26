import { HubView } from "@/components/ed/hub-view";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "ED treatment safety — side effects and warning signs",
  description: "Reviewed information on ED treatment side effects, interactions, heart health and when to get urgent help.",
  alternates: { canonical: "/ed/guides/safety" },
};

export default function SafetyHubPage() {
  return <HubView group="side-effects" title="ED treatment safety" accent="know the warning signs." eyebrow="Side effects / Start here" description="Side effects, medicine interactions and heart health before treatment. For an erection lasting more than 3 to 4 hours, chest pain, or sudden changes to your sight or hearing, call 999 or go to A&E." />;
}
