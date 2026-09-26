// Sources for the first-draft ED articles. Each URL was checked on 2026-09-26: the NHS, NaTHNaC,
// MHRA and GPhC pages loaded; NICE CKS returned HTTP 403 to the automated check (bot protection), so
// the reviewer should confirm it. Drafts cite these in "Title — URL" form, which the public article
// view turns into a numbered source list.
export const SOURCES = {
  nhsEd: "NHS: Erection problems (erectile dysfunction) — https://www.nhs.uk/conditions/erection-problems-erectile-dysfunction/",
  nhsSildenafil: "NHS: Sildenafil (Viagra) — https://www.nhs.uk/medicines/sildenafil-viagra/",
  nhsTadalafil: "NHS: Tadalafil — https://www.nhs.uk/medicines/tadalafil/",
  nhsPriapism: "NHS: Priapism (painful erections) — https://www.nhs.uk/conditions/priapism/",
  nhsHeartAttack: "NHS: Heart attack — https://www.nhs.uk/conditions/heart-attack/",
  nhs111: "NHS 111 online — https://111.nhs.uk/",
  cks: "NICE Clinical Knowledge Summaries: Erectile dysfunction — https://cks.nice.org.uk/topics/erectile-dysfunction/",
  travel: "NaTHNaC TravelHealthPro: Medicines and travel — https://www.travelhealthpro.org.uk/factsheet/43/medicines-and-travel",
  fakeMeds: "MHRA #FakeMeds campaign — https://fakemeds.campaign.gov.uk/",
  gphc: "General Pharmaceutical Council: registers — https://www.pharmacyregulation.org/registers",
  iief5: "Rosen RC et al. Development and evaluation of an abridged, 5-item version of the International Index of Erectile Function (IIEF-5). Int J Impot Res 1999;11:319–326 — https://doi.org/10.1038/sj.ijir.3900472",
} as const;

export type ArticleDraft = {
  slug: string;
  title: string;
  summary: string;
  keyFacts: string[];
  body: string;
  sources: string[];
};

// Hidden note for the clinical reviewer. HTML comments stay in the editor's source but are never
// rendered on the public page (the markdown renderer drops raw HTML).
export const reviewerNote = (text: string) => `<!-- REVIEWER: ${text} -->`;
