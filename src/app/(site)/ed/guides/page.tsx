import { HubView } from "@/components/ed/hub-view";

import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "ED guides — sourced information",
  description: "Plain-English guides to erectile dysfunction, treatment options, consultations and choosing a pharmacy, with every statement linked to its source.",
  alternates: { canonical: "/ed/guides" },
};

export default function GuidesPage() {
  return <HubView group="guides" title="ED guides" accent="with every source shown." eyebrow="Guides / Understanding ED" description="Clear information about erectile dysfunction, treatment options and what to expect from a consultation. Every statement links to its source, and each guide shows whether a named clinician has reviewed it yet." />;
}
