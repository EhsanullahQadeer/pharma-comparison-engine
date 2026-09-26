// Sources cited by ED articles, in "Title — URL" form (see src/types/article.ts). Each URL was
// checked on 2026-09-26: the NHS, NaTHNaC, MHRA, GPhC and emc (SmPC) pages loaded; NICE CKS returned
// HTTP 403 to the automated check (bot protection), so a reviewer should confirm it. Review/revision
// dates are the ones the page itself showed on that day.
export const SOURCES = {
  nhsEd: "NHS: Erection problems (erectile dysfunction) — https://www.nhs.uk/conditions/erection-problems-erectile-dysfunction/",
  nhsSildenafil: "NHS: Sildenafil (Viagra) — https://www.nhs.uk/medicines/sildenafil-viagra/",
  nhsSildenafilSideEffects: "NHS: Side effects of sildenafil (page reviewed 29 July 2026) — https://www.nhs.uk/medicines/sildenafil-viagra/side-effects-of-sildenafil/",
  nhsSildenafilWhoCan: "NHS: Who can and cannot take sildenafil (page reviewed 29 July 2026) — https://www.nhs.uk/medicines/sildenafil-viagra/who-can-and-cannot-take-sildenafil/",
  nhsSildenafilInteractions: "NHS: Taking sildenafil with other medicines and herbal supplements (page reviewed 29 July 2026) — https://www.nhs.uk/medicines/sildenafil-viagra/taking-sildenafil-with-other-medicines-and-herbal-supplements/",
  nhsTadalafil: "NHS: Tadalafil (page reviewed 13 May 2026) — https://www.nhs.uk/medicines/tadalafil/",
  nhsPriapism: "NHS: Priapism (painful erections) — https://www.nhs.uk/conditions/priapism/",
  nhsHeartAttack: "NHS: Heart attack — https://www.nhs.uk/conditions/heart-attack/",
  nhs111: "NHS 111 online — https://111.nhs.uk/",
  viagraSmpc: "Viagra 50 mg film-coated tablets: Summary of Product Characteristics, emc (text revised December 2025) — https://www.medicines.org.uk/emc/product/7980/smpc",
  cialisSmpc: "Cialis 20mg film-coated tablets: Summary of Product Characteristics, emc (text revised 27 January 2026) — https://www.medicines.org.uk/emc/product/7430/smpc",
  yellowCard: "MHRA Yellow Card scheme — https://yellowcard.mhra.gov.uk/",
  cks:"NICE Clinical Knowledge Summaries: Erectile dysfunction — https://cks.nice.org.uk/topics/erectile-dysfunction/",
  travel: "NaTHNaC TravelHealthPro: Medicines and travel — https://www.travelhealthpro.org.uk/factsheet/43/medicines-and-travel",
  fakeMeds: "MHRA #FakeMeds campaign — https://fakemeds.campaign.gov.uk/",
  gphc: "General Pharmaceutical Council: registers — https://www.pharmacyregulation.org/registers",
  iief5: "Rosen RC et al. Development and evaluation of an abridged, 5-item version of the International Index of Erectile Function (IIEF-5). Int J Impot Res 1999;11:319–326 — https://doi.org/10.1038/sj.ijir.3900472",
} as const;
