import { HubView } from "@/components/ed/hub-view";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "ED tools and reference charts",
  description: "A pack-cost calculator and reviewed reference charts. These tools don't diagnose ED, choose a treatment or decide whether a medicine is suitable for you.",
  alternates: { canonical: "/ed/tools" },
};

export default function ToolsHubPage() {
  return <HubView group="tools" title="Tools and reference charts" accent="for informed conversations." eyebrow="Tools / Reference information" description="Work out the real cost of a pack, and read reviewed reference charts ahead of a consultation. None of these tools diagnose ED or recommend a medicine; that's for the pharmacy's prescriber." />;
}
