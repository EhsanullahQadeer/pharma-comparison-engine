import { HubView } from "@/components/ed/hub-view";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "ED guides — clinically reviewed information",
  description: "Plain-English guides to erectile dysfunction, treatment options, consultations and choosing a pharmacy — each published only after clinical review.",
  alternates: { canonical: "/ed/guides" },
};

export default function GuidesPage() {
  return <HubView group="guides" title="ED guides" accent="reviewed before publishing." eyebrow="Guides / Understanding ED" description="Clear information about erectile dysfunction, treatment options and what to expect from a consultation. Every guide lists its sources and is checked by a named clinical reviewer before it appears here." />;
}
