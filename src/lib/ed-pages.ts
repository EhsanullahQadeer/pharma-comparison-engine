import { edProducts, productPath } from "@/lib/ed-products";

export const edGroups = ["pharmacies", "prices", "guides", "side-effects", "tools", "trust"] as const;

export const groupLabels = { pharmacies: "Pharmacies", prices: "Prices", guides: "Guides", "side-effects": "Side Effects", tools: "Tools", trust: "Trust" };

// Every catalogue page is one of two kinds:
// - "live": has its own route folder under src/app/(site)/ed and real content or data;
// - "article": medical/educational content served by /ed/[...slug] — a clinically reviewed Article
//   once one is PUBLISHED, otherwise the source-checked content in src/lib/sourced-articles.ts.
export type EdPageKind = "live" | "article";

const livePaths = new Set([
  "pharmacies", "pharmacies/verification", "pharmacies/submit", "pharmacies/discovery", "pharmacies/claim", "pharmacies/partners",
  "compare", "prices/sildenafil", "prices/tadalafil", "prices/pack-sizes", "prices/repeat-costs", "prices/data",
  "guides", "guides/safety", "tools", "tools/pack-cost",
  "how-it-works", "independence", "trust/pharmacy-evidence", "trust/editorial-policy", "contact",
  "trust/disclaimer", "trust/listing-disclaimer", "trust/data-transparency", "trust/about", "privacy", "terms",
  ...edProducts.map(productPath),
]);
// Live pages that show prescription-only medicine prices stay noindex (see src/lib/seo.ts). The
// product pages for pharmacy medicines, sold without a prescription, are not among them.
const pomPricingPaths = new Set([
  "pharmacies", "compare", "prices/sildenafil", "prices/tadalafil", "prices/pack-sizes", "prices/repeat-costs",
  ...edProducts.filter((product) => product.prescriptionOnly).map(productPath),
]);

const pageKind = (path: string): EdPageKind => (livePaths.has(path) ? "live" : "article");

function page(path: string, title: string, group: (typeof edGroups)[number], section: string, description: string) {
  const kind = pageKind(path);
  const live = kind === "live";
  return { path, title, group, section, description, kind, live, indexable: live && !pomPricingPaths.has(path) };
}

// Navigation, route generation, hub cards and the site map share this catalogue. Descriptions are
// public copy (shown on the site map and hub cards).
export const edPages = [
  page("pharmacies", "ED pharmacy directory", "pharmacies", "Find a pharmacy", "Every registered UK pharmacy we list for ED treatment, with its registration number, delivery area and lowest price."),
  page("pharmacies/verification", "Pharmacy verification", "pharmacies", "Find a pharmacy", "How we check a pharmacy's identity, registration and ED service before listing it, and what a listing does and doesn't prove."),
  page("pharmacies/submit", "Submit an ED pharmacy", "pharmacies", "Build the directory", "Suggest a UK pharmacy we haven't listed. Our team checks every suggestion before it appears."),
  page("pharmacies/discovery", "Automatic pharmacy discovery", "pharmacies", "Build the directory", "How we find pharmacies from official UK registers and match duplicates, with staff review before anything is published."),
  page("pharmacies/claim", "Claim or correct a listing", "pharmacies", "For pharmacies", "Report a wrong price or detail, or ask to correct your pharmacy's listing."),
  page("pharmacies/partners", "ED pharmacy partnerships", "pharmacies", "For pharmacies", "Information for pharmacies: how listing works, price feeds, and why ranking can't be bought."),
  // Products lead the Prices menu: shoppers look for a product by name, not for its medicine.
  ...edProducts.map((product) => page(productPath(product), `${product.name} prices`, "prices", "Prices by product", product.description)),
  page("compare", "Compare ED treatment prices", "prices", "Compare costs", "Viagra, Cialis and generic prices side by side, ranked by price, with delivery and consultation fees added in."),
  page("prices/sildenafil", "Sildenafil prices", "prices", "Compare costs", "Current sildenafil and Viagra prices by strength and pack size, with the time each was checked."),
  page("prices/tadalafil", "Tadalafil prices", "prices", "Compare costs", "Current tadalafil and Cialis prices by strength and pack size, with the time each was checked."),
  page("prices/pack-sizes", "Pack-size comparison", "prices", "Understand the total", "Compare total pack cost and price per tablet for the same medicine and strength."),
  page("prices/repeat-costs", "Repeat purchase costs", "prices", "Understand the total", "One-off prices compared with subscription and repeat prices, and the conditions attached."),
  page("prices/data", "Price sources and updates", "prices", "Understand the total", "Where our prices come from, how often they're checked, and how older prices are labelled."),
  page("guides", "ED guides library", "guides", "Understanding ED", "Plain-English guides to erectile dysfunction, treatment options and choosing a pharmacy, each with its sources."),
  page("guides/understanding-ed", "Understanding ED and its causes", "guides", "Understanding ED", "What erectile dysfunction is, its physical and psychological causes, and when to see a GP."),
  page("guides/ed-and-heart-health", "ED and heart health", "guides", "Understanding ED", "Why erection problems can be an early sign of narrowed arteries, and what to ask your GP."),
  page("guides/beyond-medication", "Beyond medication", "guides", "Your options", "Lifestyle changes, counselling, vacuum pumps and treating the underlying cause."),
  page("guides/talking-about-ed", "Talking about ED", "guides", "Your options", "Talking to a partner or a professional, and confidential sexual health clinics."),
  page("treatments", "ED treatment overview", "guides", "Treatment basics", "The main ED medicines, how they work, how to get them and who can't take them."),
  page("treatments/sildenafil", "Sildenafil explained", "guides", "Treatment basics", "How sildenafil (Viagra) is taken, how long it works, side effects and what to avoid."),
  page("treatments/tadalafil", "Tadalafil explained", "guides", "Treatment basics", "How tadalafil (Cialis) is taken, when needed or daily, side effects and what to avoid."),
  page("guides/first-consultation", "Your first ED consultation", "guides", "Treatment basics", "What you'll be asked, NHS versus private routes, and checking an online service."),
  page("guides/choosing-a-pharmacy", "Choosing an ED pharmacy", "guides", "Practical guidance", "How to check a pharmacy is registered, spot fake medicines and compare the whole cost."),
  page("guides/travel-and-delivery", "Travel, delivery and storage", "guides", "Practical guidance", "Travelling with ED medicines, what to check about delivery, and how to store them."),
  page("guides/managing-treatment", "Managing ED treatment", "guides", "Practical guidance", "If treatment doesn't seem to work, repeat supplies, switching pharmacy and reporting side effects."),
  page("guides/news", "ED medicine news and alerts", "guides", "Practical guidance", "Dated guidance updates and safety warnings about ED medicines, each linked to its source."),
  page("guides/safety", "ED treatment safety overview", "side-effects", "Start here", "Side effects, interactions, heart health and when to get urgent help."),
  page("side-effects/contact-your-prescriber", "Contacting your prescriber", "side-effects", "Start here", "When to contact your prescriber, what to have ready, and how to report a side effect."),
  page("side-effects/urgent-warning-signs", "Urgent warning signs", "side-effects", "Priority safety content", "Symptoms that need 999 or urgent help, such as an erection lasting over 4 hours or chest pain."),
  page("side-effects/cardiovascular-safety", "Heart health before treatment", "side-effects", "Priority safety content", "The heart and blood pressure conditions that rule ED medicines out, and what to tell your prescriber."),
  page("side-effects/interactions", "Medicine and substance interactions", "side-effects", "Priority safety content", "Nitrates, poppers, alpha-blockers, other medicines, grapefruit and alcohol."),
  page("side-effects/common", "Common side effects", "side-effects", "Symptoms explained", "The side effects of sildenafil and tadalafil, how common each one is, and what to do."),
  page("side-effects/vision-and-hearing", "Vision and hearing changes", "side-effects", "Symptoms explained", "Temporary vision changes versus sudden loss of sight or hearing, which needs urgent help."),
  page("tools", "ED tools and reference charts", "tools", "Reference information", "Calculators and reference charts. None of them diagnoses ED or chooses a treatment."),
  page("tools/medicine-comparison", "Sildenafil vs tadalafil", "tools", "Reference information", "The two main ED medicines side by side, from their official product information."),
  page("tools/onset-and-duration", "Onset and duration reference", "tools", "Reference information", "When each medicine is taken and how long its effect lasted in clinical studies."),
  page("tools/strengths", "Medicine strengths reference", "tools", "Reference information", "The strengths each medicine comes in and the usual doses in the product information."),
  page("tools/pack-cost", "ED pack-cost calculator", "tools", "Prepare a comparison", "Work out cost per tablet and total pack cost, with delivery and consultation shown separately."),
  page("tools/iief-5", "IIEF-5 assessment explainer", "tools", "Prepare a consultation", "What the IIEF-5 questionnaire is, how clinicians use it and what it can't tell you."),
  page("tools/heart-health-checklist", "Heart-health discussion checklist", "tools", "Prepare a consultation", "What to note down before a consultation. A preparation list, not a medical clearance."),
  page("how-it-works", "How ED comparison works", "trust", "Our approach", "How we find pharmacies, check prices and send you to the pharmacy for its consultation."),
  page("independence", "Independence and referral income", "trust", "Our approach", "Who pays us, how ranking is decided, and how any commercial relationship would be disclosed."),
  page("trust/pharmacy-evidence", "Pharmacy evidence and checks", "trust", "Our approach", "The registration evidence behind each listing and the dates it was checked."),
  page("trust/editorial-policy", "Editorial and clinical review", "trust", "Our approach", "How our guides are written, sourced, reviewed and corrected."),
  page("trust/about", "About PharmaCompare ED", "trust", "About and support", "What we do and don't do, and the principles behind this comparison."),
  page("contact", "Contact the ED comparison team", "trust", "About and support", "Send us a question, a correction or a pharmacy enquiry."),
  page("privacy", "ED platform privacy policy", "trust", "Policies", "What we collect (only what you type into a form), why, and your rights."),
  page("terms", "ED platform terms of use", "trust", "Policies", "The terms for using this site, and how they differ from each pharmacy's terms."),
  page("trust/disclaimer", "ED information disclaimer", "trust", "Policies", "The limits of our guides and prices, and the role of your prescriber."),
  page("trust/listing-disclaimer", "Pharmacy listing disclaimer", "trust", "Policies", "What a listing means, and why it isn't an endorsement."),
  page("trust/data-transparency", "Listing and price data transparency", "trust", "Policies", "Our data sources, checked dates, corrections and how missing information is shown."),
];

export type EdPage = (typeof edPages)[number];

// Paths an Article can be written for (the admin editor's slug picker and the article route).
export const articlePages = edPages.filter((entry) => entry.kind === "article");

export const edHref = (path: string) => `/ed/${path}`;
export const navigationGroups = edGroups.map((id) => ({
  id, label: groupLabels[id],
  sections: [...new Set(edPages.filter((entry) => entry.group === id).map((entry) => entry.section))].map((label) => ({
    label, pages: edPages.filter((entry) => entry.group === id && entry.section === label),
  })),
}));
export const publicRoutes = [{ href: "/", indexable: true }, { href: "/ed/site-map", indexable: true }, ...edPages.map((entry) => ({ href: edHref(entry.path), indexable: entry.indexable }))];
