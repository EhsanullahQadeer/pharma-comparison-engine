export const edGroups = ["pharmacies", "prices", "treatments", "guides", "about"] as const;

export const edPages = [
  { id: "pharmacies", path: "pharmacies", group: "pharmacies", phase: 1 },
  { id: "submit", path: "pharmacies/submit", group: "pharmacies", phase: 1 },
  { id: "discovery", path: "pharmacies/discovery", group: "pharmacies", phase: 1 },
  { id: "verification", path: "pharmacies/verification", group: "pharmacies", phase: 1 },
  { id: "compare", path: "compare", group: "prices", phase: 2 },
  { id: "sildenafilPrices", path: "prices/sildenafil", group: "prices", phase: 2 },
  { id: "tadalafilPrices", path: "prices/tadalafil", group: "prices", phase: 2 },
  { id: "packs", path: "prices/pack-sizes", group: "prices", phase: 2 },
  { id: "repeat", path: "prices/repeat-costs", group: "prices", phase: 2 },
  { id: "treatments", path: "treatments", group: "treatments", phase: 3 },
  { id: "sildenafil", path: "treatments/sildenafil", group: "treatments", phase: 3 },
  { id: "tadalafil", path: "treatments/tadalafil", group: "treatments", phase: 3 },
  { id: "guides", path: "guides", group: "guides", phase: 3 },
  { id: "safety", path: "guides/safety", group: "guides", phase: 3 },
  { id: "choosing", path: "guides/choosing-a-pharmacy", group: "guides", phase: 3 },
  { id: "howItWorks", path: "how-it-works", group: "about", phase: 3 },
  { id: "independence", path: "independence", group: "about", phase: 3 },
  { id: "contact", path: "contact", group: "about", phase: 3 },
  { id: "privacy", path: "privacy", group: "about", phase: 3 },
  { id: "terms", path: "terms", group: "about", phase: 3 },
] as const;

export const edHref = (path: string) => `/ed/${path}`;
export const pagesByGroup = Object.fromEntries(
  edGroups.map((group) => [group, edPages.filter((page) => page.group === group)]),
) as unknown as Record<(typeof edGroups)[number], readonly (typeof edPages)[number][]>;
