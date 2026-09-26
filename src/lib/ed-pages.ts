export const edGroups = ["pharmacies", "prices", "guides", "side-effects", "tools", "trust"] as const;

export const groupLabels = { pharmacies: "Pharmacies", prices: "Prices", guides: "Guides", "side-effects": "Side Effects", tools: "Tools", trust: "Trust" };

export const deliveryStages = [
  { id: 1, title: "Pharmacy directory", milestone: "M3–M4", status: "First priority", description: "Build the directory through manual entry and automatic discovery, with review before publication.", remaining: ["Staff access and manual pharmacy entry", "Source imports, duplicate matching and change review", "ED-service checks and approved profiles with evidence dates"] },
  { id: 2, title: "ED price comparison", milestone: "M5", status: "Planned", description: "Collect matching sildenafil and tadalafil offers and show the full payable cost.", remaining: ["Manual prices, partner feeds and permitted collection", "Refresh schedules, failure alerts and stale-price handling", "Strength, pack, delivery and consultation cost comparisons"] },
  { id: 3, title: "Guides, safety and trust", milestone: "M1, M6", status: "Planned", description: "Prepare reviewed ED education, reference tools and transparent policies alongside the directory rollout.", remaining: ["Publication boundaries and commercial disclosures", "Named reviewers, sourced articles and review dates", "Reference tools and questionnaire reproduction-rights checks"] },
  { id: 4, title: "Partnerships and pilot launch", milestone: "M7–M8", status: "Planned", description: "Activate agreed pharmacy referrals and validate the service with a pilot.", remaining: ["Pharmacy agreements, attribution and reporting", "Privacy, accessibility and end-to-end checks", "Live listing and price-quality validation"] },
  { id: 5, title: "Optional later features", milestone: "M9–M10", status: "Deferred", description: "Accounts, alerts and any clinical-service expansion require a separate scope decision.", remaining: ["Decide whether saved comparisons and alerts are needed", "Review consent before retaining sensitive preferences", "Scope prescribing separately from this comparison platform"] },
] as const;

// Every catalogue page is one of three kinds:
// - "live": has its own route folder under src/app/(site)/ed and real content or data;
// - "article": medical/educational content, shown only once a clinically reviewed Article for that
//   path is PUBLISHED (served by /ed/[...slug]; otherwise it stays a coming-soon preview);
// - "preview": still a coming-soon page (e.g. privacy/terms, pending business details).
export type EdPageKind = "live" | "article" | "preview";

const livePaths = new Set([
  "pharmacies", "pharmacies/verification", "pharmacies/submit", "pharmacies/discovery", "pharmacies/claim", "pharmacies/partners",
  "compare", "prices/sildenafil", "prices/tadalafil", "prices/pack-sizes", "prices/repeat-costs", "prices/data",
  "guides", "guides/safety", "tools", "tools/pack-cost",
  "how-it-works", "independence", "trust/pharmacy-evidence", "trust/editorial-policy", "contact",
  "trust/disclaimer", "trust/listing-disclaimer", "trust/data-transparency",
]);
const articlePaths = new Set([
  "guides/understanding-ed", "guides/ed-and-heart-health", "guides/beyond-medication", "guides/talking-about-ed",
  "treatments", "treatments/sildenafil", "treatments/tadalafil", "guides/first-consultation", "guides/choosing-a-pharmacy",
  "guides/travel-and-delivery", "guides/managing-treatment", "guides/news",
  "side-effects/contact-your-prescriber", "side-effects/urgent-warning-signs", "side-effects/cardiovascular-safety",
  "side-effects/interactions", "side-effects/common", "side-effects/vision-and-hearing",
  "tools/medicine-comparison", "tools/onset-and-duration", "tools/strengths", "tools/iief-5", "tools/heart-health-checklist",
]);
// Live pages that show prescription-only medicine prices stay noindex (see src/lib/seo.ts).
const pomPricingPaths = new Set(["pharmacies", "compare", "prices/sildenafil", "prices/tadalafil", "prices/pack-sizes", "prices/repeat-costs"]);

function pageKind(path: string): EdPageKind {
  if (livePaths.has(path)) return "live";
  return articlePaths.has(path) ? "article" : "preview";
}

function page(path: string, title: string, group: (typeof edGroups)[number], section: string, stage: 1 | 2 | 3 | 4, description: string) {
  const kind = pageKind(path);
  const live = kind === "live";
  return { path, title, group, section, stage, description, kind, live, indexable: live && !pomPricingPaths.has(path) };
}

// Navigation, route generation and previews share this catalogue.
export const edPages = [
  page("pharmacies", "ED pharmacy directory", "pharmacies", "Find a pharmacy", 1, "Browse approved UK ED pharmacies with service details, regulator links and checked dates."),
  page("pharmacies/verification", "Pharmacy verification", "pharmacies", "Find a pharmacy", 1, "Explain identity, registration and ED-service checks, and the limits of what a listing establishes."),
  page("pharmacies/submit", "Submit an ED pharmacy", "pharmacies", "Build the directory", 1, "Suggest a pharmacy for manual staff review, including its website, registration and ED services. Submissions are not open yet."),
  page("pharmacies/discovery", "Automatic pharmacy discovery", "pharmacies", "Build the directory", 1, "Import candidates from approved sources, match duplicates and flag changes. Staff review and ED-service checks will precede publication."),
  page("pharmacies/claim", "Claim or correct a listing", "pharmacies", "For pharmacies", 1, "Request corrections or claim a profile after ownership checks. Listing inclusion and referral participation are separate."),
  page("pharmacies/partners", "ED pharmacy partnerships", "pharmacies", "For pharmacies", 4, "Explain referral participation, offer feeds and reporting once commercial terms and disclosures are agreed."),
  page("compare", "Compare ED treatment prices", "prices", "Compare costs", 2, "Compare matching medicine, strength and pack sizes with known delivery and consultation charges included."),
  page("prices/sildenafil", "Sildenafil prices", "prices", "Compare costs", 2, "Show sildenafil offers with pack quantity, total cost, source and last-checked time."),
  page("prices/tadalafil", "Tadalafil prices", "prices", "Compare costs", 2, "Show tadalafil offers with clear strengths, pack quantities and purchase conditions."),
  page("prices/pack-sizes", "Pack-size comparison", "prices", "Understand the total", 2, "Compare total pack cost and price per tablet for the same medicine and strength."),
  page("prices/repeat-costs", "Repeat purchase costs", "prices", "Understand the total", 2, "Distinguish introductory offers from standard repeat prices and explain offer conditions."),
  page("prices/data", "Price sources and updates", "prices", "Understand the total", 2, "Explain manual updates, partner feeds, permitted collection, fetch intervals, failures and stale-price labels."),
  page("guides", "ED guides library", "guides", "Understanding ED", 3, "Browse reviewed information about ED, treatment options and choosing a pharmacy."),
  page("guides/understanding-ed", "Understanding ED and its causes", "guides", "Understanding ED", 3, "Cover prevalence, sudden versus gradual changes, physical and psychological causes, and medicine-related ED."),
  page("guides/ed-and-heart-health", "ED and heart health", "guides", "Understanding ED", 3, "Explain the relationship between ED and cardiovascular health and topics to raise with a clinician."),
  page("guides/beyond-medication", "Beyond medication", "guides", "Your options", 3, "Cover devices, exercises, counselling, lifestyle changes and specialist treatments alongside tablet options."),
  page("guides/talking-about-ed", "Talking about ED", "guides", "Your options", 3, "Address partner conversations, stigma, performance anxiety and preparing to speak with a professional."),
  page("treatments", "ED treatment overview", "guides", "Treatment basics", 3, "Introduce treatment options and professional assessment without selecting a medicine for an individual."),
  page("treatments/sildenafil", "Sildenafil explained", "guides", "Treatment basics", 3, "Provide a sourced introduction to sildenafil and topics to discuss with a pharmacist or prescriber."),
  page("treatments/tadalafil", "Tadalafil explained", "guides", "Treatment basics", 3, "Provide a sourced introduction to tadalafil and topics to discuss with a pharmacist or prescriber."),
  page("guides/first-consultation", "Your first ED consultation", "guides", "Treatment basics", 3, "Explain assessments, ID checks, GP communication, legal purchase routes and NHS versus private care."),
  page("guides/choosing-a-pharmacy", "Choosing an ED pharmacy", "guides", "Practical guidance", 3, "Explain registration checks, consultations, generic and branded offers and reviewing an online pharmacy."),
  page("guides/travel-and-delivery", "Travel, delivery and storage", "guides", "Practical guidance", 3, "Cover discreet packaging, delivery, airport checks, travelling with medicines and storage."),
  page("guides/managing-treatment", "Managing ED treatment", "guides", "Practical guidance", 3, "Cover repeat prescriptions, switching pharmacy and discussing concerns with a prescriber, without self-adjustment advice."),
  page("guides/news", "ED medicine news and alerts", "guides", "Practical guidance", 3, "Publish sourced counterfeit medicine alerts, guidance updates, supply and pricing news."),
  page("guides/safety", "ED treatment safety overview", "side-effects", "Start here", 3, "Introduce the planned safety library and reviewed information sources."),
  page("side-effects/contact-your-prescriber", "Contacting your prescriber", "side-effects", "Start here", 3, "Explain how to prepare questions about symptoms, duration of effects and treatment concerns."),
  page("side-effects/urgent-warning-signs", "Urgent warning signs", "side-effects", "Priority safety content", 3, "Plan reviewed coverage of prolonged erections, sudden vision or hearing changes, chest pain and allergic reactions. This preview is not an emergency guide."),
  page("side-effects/cardiovascular-safety", "Heart health before treatment", "side-effects", "Priority safety content", 3, "Explain cardiovascular assessment before treatment and why existing conditions may need clinical review."),
  page("side-effects/interactions", "Medicine and substance interactions", "side-effects", "Priority safety content", 3, "Plan reviewed information on nitrates, alpha-blockers, recreational nitrites, alcohol and grapefruit. An interaction checker is not available."),
  page("side-effects/common", "Common side effects", "side-effects", "Symptoms explained", 3, "Cover headache, flushing, indigestion, congestion, dizziness and back or muscle pain with reviewed signposting."),
  page("side-effects/vision-and-hearing", "Vision and hearing changes", "side-effects", "Symptoms explained", 3, "Distinguish different symptoms and explain when urgent help is needed, after clinical review."),
  page("tools", "ED tools and reference charts", "tools", "Reference information", 3, "Browse informational tools that will not diagnose ED, select treatment or determine eligibility."),
  page("tools/medicine-comparison", "Sildenafil vs tadalafil", "tools", "Reference information", 3, "Provide a reviewed comparison without personalised treatment recommendations."),
  page("tools/onset-and-duration", "Onset and duration reference", "tools", "Reference information", 3, "Show general onset and duration information in a sourced, clinically reviewed chart."),
  page("tools/strengths", "Medicine strengths reference", "tools", "Reference information", 3, "Explain strengths and formulations without calculating or recommending a dose."),
  page("tools/pack-cost", "ED pack-cost calculator", "tools", "Prepare a comparison", 2, "Calculate cost per tablet and total pack cost, with delivery and consultation charges shown separately."),
  page("tools/iief-5", "IIEF-5 assessment explainer", "tools", "Prepare a consultation", 3, "Explain the questionnaire's role in consultation. Reproduction rights and clinical review must be resolved before publishing any questionnaire."),
  page("tools/heart-health-checklist", "Heart-health discussion checklist", "tools", "Prepare a consultation", 3, "Prepare a conversation with a prescriber. This will not provide medical clearance or a purchase decision."),
  page("how-it-works", "How ED comparison works", "trust", "Our approach", 3, "Explain finding a pharmacy, checking offers and continuing to the pharmacy for its consultation and purchase process."),
  page("independence", "Independence and referral income", "trust", "Our approach", 3, "Publish approved rules for inclusion, ranking and referral income so commercial relationships are clear."),
  page("trust/pharmacy-evidence", "Pharmacy evidence and checks", "trust", "Our approach", 1, "Explain registration evidence, unknown information and checked dates, without an invented composite safety score."),
  page("trust/editorial-policy", "Editorial and clinical review", "trust", "Our approach", 3, "Describe authorship, sources, clinical review, corrections and review schedules."),
  page("trust/about", "About PharmaCompare ED", "trust", "About and support", 3, "Introduce the service, team and UK ED comparison scope once business details are confirmed."),
  page("contact", "Contact the ED comparison team", "trust", "About and support", 3, "Provide a future contact route for questions, listing corrections and pharmacy enquiries. Submissions are not open yet."),
  page("privacy", "ED platform privacy policy", "trust", "Policies", 3, "Publish the approved data collection, analytics, retention, consent and privacy-rights policy before those features launch."),
  page("terms", "ED platform terms of use", "trust", "Policies", 3, "Explain terms for the comparison service and the separate terms of each pharmacy."),
  page("trust/disclaimer", "ED information disclaimer", "trust", "Policies", 3, "Explain the limits of educational and comparison information and the role of healthcare professionals."),
  page("trust/listing-disclaimer", "Pharmacy listing disclaimer", "trust", "Policies", 3, "Explain coverage and accuracy limits and why inclusion does not mean endorsement or a referral agreement."),
  page("trust/data-transparency", "Listing and price data transparency", "trust", "Policies", 3, "Describe sources, reuse permissions, checked dates, correction requests and missing or outdated information."),
];

export type EdPage = (typeof edPages)[number];

// Paths an Article can be written for (the admin editor's slug picker and the article route).
export const articlePages = edPages.filter((entry) => entry.kind === "article");

export const edHref = (path: string) => `/ed/${path}`;
export const navigationGroups = edGroups.map((id) => ({
  id, label: groupLabels[id],
  liveCount: edPages.filter((entry) => entry.group === id && entry.live).length,
  sections: [...new Set(edPages.filter((entry) => entry.group === id).map((entry) => entry.section))].map((label) => ({
    label, pages: edPages.filter((entry) => entry.group === id && entry.section === label),
  })),
}));
export const publicRoutes = [{ href: "/", indexable: true }, { href: "/ed/roadmap", indexable: false }, ...edPages.map((entry) => ({ href: edHref(entry.path), indexable: entry.indexable }))];
