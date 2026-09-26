# M6 — Educational Content, Trust & Search Discovery

**Status:** 🟨 In progress — in-app article workflow, citations, provider trust pages and source-checked drafts for every guide/side-effects/tool page are built; nothing is clinically reviewed or published yet (23 drafts, 2026-09-26)
**Depends on:** M1–M3; can overlap M4/M5
**Roadmap:** [monj-functionality-and-ed-milestones.md § Milestone 6](../monj-functionality-and-ed-milestones.md#milestone-6--educational-content-trust-and-search-discovery)
**Platform context:** [`00-platform-strategy.md`](00-platform-strategy.md) — the entire taxonomy below is the ED vertical's content and stays as its design record unchanged. A weight-loss deployment needs its own equivalent taxonomy (built from the weight-loss patient journey, the same way this file explicitly refused to just relabel Monj's columns for ED) — that's new content-planning work for whenever the weight-loss vertical is actually scheduled, not a retrofit of this file. One weight-loss-specific point worth flagging now: per `01-scope-and-compliance.md`'s compliance framework, weight-loss GLP-1s have no P-medicine tier, so a weight-loss vertical's price-related content stays `noindex`-gated from day one, with no equivalent of ED's "P-medicine pages can go live immediately" path.

**2026-09-14 update:** the original roadmap scoped this milestone conservatively — "reviewed ED explanations… an optional pack-cost calculator fits the comparison model. A symptom checker, treatment diary or moderated community is a separate later feature." Reviewing Monj's actual live navigation (Guides / Side Effects / Tools / Trust mega-menus, ~80+ articles, a persistent trust bar, and a cited-article template) showed content depth is not a nice-to-have there — it's most of the site. This file now carries a content taxonomy so M6 isn't rediscovered from scratch later. Tools are covered separately in [`09-retention-tools.md`](09-retention-tools.md).

**2026-09-14, later same day — correction:** the first pass at the taxonomy below mostly took Monj's own *column labels* (Getting Started, Travel & Practical, Diet & Lifestyle, Policy & News, Managing Treatment) and reskinned them with ED words. That's copying a structure, not thinking about what ED patients actually need — weight-loss-drug content and ED content don't have the same shape. Monj is used here only as a reference for *how much depth and what kind of trust mechanics* a comparison site needs (mega-menu scale, urgency-first side-effects, a trust hub, cited articles) — not as a content outline to relabel. The taxonomy below has been rebuilt starting from the actual ED patient journey; several categories (Understanding ED, Beyond Medication, Talking About It, the cardiovascular-risk safety content) have no Monj equivalent at all, because ED and GLP-1 weight-loss treatment genuinely raise different concerns.

## What we're building

**2026-09-15 implementation update:** Navigation now exposes the ED taxonomy through 50 coming-soon routes across the platform, including Guides, Side Effects, Tools and Trust topic hubs. These hubs group the detailed articles below; individual article writing, clinical review and publication remain pending. The trust preview uses **Pharmacy evidence and checks**, not a composite pharmacy safety score. Route metadata and a route-derived sitemap are implemented; previews remain noindex. See [M2](02-layout-theme-foundation.md) for configuration and verification details.

- A **guides library** covering the ED treatment journey, not just condition basics.
- A **side-effects library** organised by urgency and body system, with dangerous drug interactions as a first-class, prominent category — not an afterthought.
- Provider trust pages **and** a general trust/legal hub (About, Editorial Policy, How Pricing Works, legal pages) — Monj treats "Trust" as a top-level nav item, not a footer afterthought.
- An article authoring/review workflow with named author, reviewer, sources and dates, rendered with numbered citations and a "Key facts" summary box (the pattern observed on Monj's article pages).
- SEO plumbing: metadata, canonical URLs, sitemap.

## Content taxonomy (ED adaptation of Monj's observed IA)

This is a working list to scope articles against, not a commitment to write all of them before launch — cross off / reprioritise as M1's publication-boundary decision and M8's launch date become concrete. Roadmap §3 already names sildenafil and tadalafil as the initial catalogue; the taxonomy below is written around those two.

### Guides

Ordered roughly the way a real visitor's understanding would progress — cause, before deciding on medication at all, before comparing specific products — rather than Monj's grouping, which starts from "what is the product."

| Column | Articles | Why this column exists for ED specifically |
| --- | --- | --- |
| **Understanding ED** *(no Monj equivalent)* | How common is this, really? (prevalence by age, normalising) · Sudden-onset vs gradual ED: what the difference usually suggests, in general terms · Common causes: vascular, psychological, hormonal, medication side-effects, diabetes-related · **ED as an early warning sign of cardiovascular disease** — why NICE/NHS guidance treats new ED as a reason to check heart health, not just a nuisance to medicate past · When ED is a side-effect of another medicine (antidepressants, blood-pressure drugs) | Weight-loss content starts from "here's the drug." ED content has to start from "here's the condition and why it happens," because the underlying cause materially changes what's appropriate — and because ED can be a genuine early symptom of a separate, more serious condition. This is arguably the single most clinically important content category on the whole site. |
| **Beyond medication** *(no Monj equivalent)* | Non-drug options overview (the roadmap's own research explicitly warns against implying tablets are the only option) · Vacuum erection devices, in plain terms · Injection-based treatment (alprostadil), in plain terms · Pelvic floor exercises · Lifestyle changes with actual evidence behind them (smoking cessation, weight, alcohol, exercise) · Counselling/therapy for psychological ED · Testosterone: when it's actually relevant, and when it isn't | GLP-1 weight-loss sites don't have a "there are other treatment modalities entirely" category because the drug *is* the intervention. For ED, tablets are one option among several, and balanced coverage of alternatives is both more honest and reduces the "just sell pills" framing that undermines trust. |
| **Talking about it** *(no Monj equivalent)* | It's more common than the silence around it suggests · Talking to a partner about it · Performance anxiety and the anxiety-ED feedback loop · Why people avoid their GP for this, and why that's a real problem (ties directly to the trust/verified-pharmacy pitch — people turn to unverified sources partly out of embarrassment) | ED carries a stigma that BMI/weight doesn't carry in the same way. Content that normalises and reduces shame is both genuinely useful and a legitimate trust-building differentiator — it's also the honest answer to "why would someone use an anonymous comparison site instead of just asking their GP." |
| **Getting started with treatment** | What is sildenafil? / What is tadalafil? · Sildenafil vs tadalafil: an informational comparison (never framed as "which should I take") · Your first prescription, step by step · Buying ED medication in the UK: the legal route · ED treatment on the NHS vs privately · Generic vs brand explained · Do pharmacies tell my GP? | Product-specific content — this is the closest column to Monj's "Getting Started," kept because it's genuinely needed once someone has decided medication is worth exploring. |
| **Travel & practical** | Travelling with prescription medication · Airport security and PDE5 inhibitors · Delivery options · Discreet packaging explained · Storage & shelf life | Logistics content, low clinical risk, worth keeping regardless of source. |
| **Policy & news** | MHRA alerts: counterfeit ED medication · NICE/NHS guidance updates · Generic sildenafil/tadalafil supply and pricing news | Same purpose as any comparison site's news column; low clinical risk. |
| **Managing treatment** | Switching between sildenafil and tadalafil · Switching pharmacy · Repeat prescriptions explained · What if it doesn't work the first time? (signposts back to prescriber — never self-adjustment advice) · ID checks without a passport | Kept from the earlier draft — genuinely applicable regardless of source site. |

### Side effects — organise by urgency first, body system second

Monj's side-effects menu is organised as start-here / body-system columns with a separate "urgent warning signs" column. For PDE5 inhibitors specifically, the urgent/interaction content is more safety-critical than the weight-loss-drug equivalent, so it needs to be genuinely prominent — first item in the section, not buried in a body-system column.

| Category | Content | Why it's categorised this way |
| --- | --- | --- |
| **Start here** | Symptom map · Contact your prescriber · How long side effects last · What to do if you feel unwell | Orientation, mirrors Monj directly |
| **Urgent warning signs** *(top billing)* | **Priapism** — erection lasting more than 4 hours is a medical emergency · Sudden vision loss / NAION · Sudden hearing loss · Chest pain during or after sex · Severe allergic reaction | These are labelled warnings for PDE5 inhibitors specifically (priapism, NAION) — not generic "see a doctor if concerned" filler. Must link to NHS 111/999 guidance, not just describe the symptom. |
| **Cardiovascular safety before starting** *(no Monj equivalent — this is ED-specific, not a relabelled weight-loss category)* | Why heart health is checked before prescribing PDE5 inhibitors · Recent heart attack, stroke or uncontrolled blood pressure: why these need medical clearance first, in general terms · Sexual activity and cardiac risk, per NICE/cardiology guidance | Sildenafil/tadalafil prescribing guidelines (built on cardiology consensus frameworks such as the Princeton Consensus criteria) specifically gate prescribing on baseline cardiac risk, independent of any drug interaction. This is a distinct safety concept from "don't mix with nitrates" below, and GLP-1 weight-loss content has no equivalent because the underlying risk model is completely different. |
| **Dangerous interactions** | **Nitrates** — why the combination is dangerous (severe hypotension) · Alpha-blockers and blood-pressure medication · Recreational nitrites ("poppers") · Alcohol and PDE5 inhibitors · Grapefruit/grapefruit juice (minor but real CYP3A4 interaction) | Weight-loss drugs don't have an equivalent single life-threatening interaction; PDE5 inhibitors do (nitrates). This category doesn't exist in Monj's taxonomy and must not be dropped just because it wasn't in the reference site. |
| **Common, non-urgent** | Headache · Flushing · Indigestion · Nasal congestion · Dizziness · Back/muscle pain (more tadalafil-specific) | Mirrors Monj's "common" columns |
| **Vision & hearing** | Blue-tinge vision (cyanopsia) — common, usually not an emergency · Blurred vision · When visual changes need urgent review | Deliberately separate from "urgent warning signs" — cyanopsia is common and benign, NAION is rare and an emergency; conflating them either alarms people unnecessarily or under-warns them. The article must draw this line clearly. |

### ED-specific informational tools (no Monj equivalent — not the reclassified reference charts in `09-retention-tools.md`)

Two tools worth building that come from real clinical practice around ED specifically, not from copying Monj's calculator list:

- **IIEF-5 self-assessment explainer** — the International Index of Erectile Function (5-item version) is the validated questionnaire real prescribers and NHS services actually use. Publishing it as a **self-understanding tool** — show the five questions, explain how scoring bands map to "mild / moderate / severe" in general clinical terms, and end every result with "bring this to your prescriber conversation" — is standard, legitimate practice (the NHS and private telehealth services both do this). This is meaningfully different from the "which product suits you" personalisation quiz flagged as high-risk in `09-retention-tools.md`: IIEF-5 doesn't output a product recommendation, it outputs a standard clinical score for the user's own understanding and to prepare for a real consultation.
- **Cardiovascular pre-screening checklist** — a plain-language checklist mirroring the questions a prescriber would ask before approving PDE5 inhibitor use (recent cardiac event, uncontrolled blood pressure, currently on nitrates) with a clear "if you tick any of these, this isn't a self-service decision — speak to a doctor first" outcome. Not diagnostic, not a purchase gate by itself (the actual prescribing/eligibility decision stays with the pharmacy's own consultation, per roadmap §1's "no eligibility decision on our site" boundary) — but genuinely useful, safety-first content that differentiates from a site that only shows prices.

Both tools must be reviewed by the named clinical reviewer (see Open questions) before publishing, and both must end in "discuss with a prescriber," never in a self-diagnosis or product steer.

### Trust hub (near-direct transfer from Monj, roadmap already names most of these as routes)

| Column | ED equivalent | Status against current route registry |
| --- | --- | --- |
| Our checks | GPhC verification · Pharmacy score · Independence statement · Editorial & review policy · How we work · How pricing works | `independence`, `how-it-works` already in `ed-pages.ts`; `editorial-policy` added as a route. "Pharmacy score" deliberately built as `trust/pharmacy-evidence` instead — no composite score, per the hard constraint below |
| About us | About us · Contact | `contact`, `trust/about` already in `ed-pages.ts` |
| Legal | Privacy policy · Terms of use · Disclaimers · Listing disclaimer · Legal & data transparency | `privacy`, `terms`, `trust/disclaimer`, `trust/listing-disclaimer`, `trust/data-transparency` all already in `ed-pages.ts` |

Deliberately **not** carrying over: Monj's "Monjour Forum & Support" (community) and "Charity Pledge." Community/moderated forum is explicitly a separate, later feature per the main roadmap's M6/M9 notes — don't build it as part of this milestone. A charity pledge is a business decision, not a content-build item; raise it with the client rather than assuming it.

### Article template (validated against a real Monj article page)

Observed pattern: byline with author name + credential (e.g. "Independent Prescription Pricing Analyst") + organisation, `Published` and `Checked` dates, a "Key facts" callout box near the top, body sections with numbered inline citations `[1] [2] [3]` linking to a references list, and internal links to related articles (e.g. "See staying hydrated").

This validates the `Article`/`Evidence` fields already planned in M3a (author, reviewer, sources, dates) — but surfaces one gap: **we need a citation/footnote rendering component** (numbered inline references + a sourced references list), which wasn't previously called out as its own build item.

## How we're building it

- The `Article` model is already scoped in M3a's schema plan (author, reviewer, sources, language, publication/review dates, revision).
- Content is authored either directly in-app (Custom) or in an external CMS synced in (Hybrid) — see Alternatives; not yet decided. Given the article volume implied by the taxonomy above (dozens of articles across guides + side effects), lean toward the Hybrid/CMS route sooner rather than later — an in-app rich-text editor for this volume is a real build item, not a footnote.
- Trust/evidence display reuses the `Evidence` model (source URL, retrieved date, checked date, reviewer, approved status) already planned for provider data in M3a — same pattern, different entity, so the UI is built once and reused.
- New build item: a citation/footnote component (numbered inline markers + references list) for the article template.
- SEO: `generateMetadata` per route once real routes exist (M2), plus a generated `sitemap.xml` via Next.js's built-in `app/sitemap.ts` convention.
- Hard constraint from roadmap §2.6: never invent a composite "safety score." Link to the actual regulator source, label clearly as provider-reported vs. independently checked, and remember a missing published inspection is not automatically a failed one.
- Hard constraint specific to this ED adaptation: articles comparing sildenafil vs. tadalafil, or discussing dose strengths, must be written and reviewed as **informational comparisons**, never as personalised recommendations — this is the same line the roadmap draws for tools in M9, and it applies just as much to prose content.
- Second hard constraint, specific to the new "Understanding ED" / cardiovascular-safety content: it must stay in the register of "here's what the evidence generally shows" and "here's what to raise with a prescriber," never "your ED is caused by X" or "you are/aren't safe to take this." The cardiovascular-safety checklist in particular must route to "speak to a doctor," not attempt to gate access to comparison content itself.

## Alternatives considered

| Approach | Trade-off |
| --- | --- |
| Custom — article editing/revisions/approval built inside the app | One system; editorial tooling takes real effort at this content volume |
| Third party — CMS + specialist medical editorial service | Strong authoring support; ongoing content and vendor cost |
| **Hybrid (recommended by roadmap, and more clearly justified now)** — CMS for writing, custom provider evidence and clinical review before publishing | Clear division of responsibility; requires review discipline; content volume observed on Monj makes the in-app-only option look under-scoped |

## Checklist

- [x] CMS vs. in-app authoring decided — in-app (`Article` model + `/admin/articles`)
- [x] `Article` CRUD (author / reviewer / sources / dates / revision) — `/admin/articles`, `src/actions/articles/articles.ts`
- [x] Citation/footnote rendering component (numbered inline refs + references list) — `article-markdown.tsx` + `article-view.tsx`, `src/lib/article-citations.ts`
- [x] Clinical review/approval workflow before publish — DRAFT → IN_REVIEW → PUBLISHED; a reviewer other than the author must approve (`reviewArticle`)
- [x] Guides library: **Understanding ED** articles (prevalence, sudden vs gradual causes, ED as a cardiovascular warning sign, medication-induced ED) — write early; this content doesn't depend on which pharmacies/providers are live yet — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [x] Guides library: **Beyond Medication** articles (devices, injections, pelvic floor exercises, lifestyle evidence, counselling, testosterone) — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [x] Guides library: **Talking About It** articles (prevalence/normalising, partner communication, performance anxiety, why people avoid their GP) — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [x] Guides library: Getting Started With Treatment articles, including the sildenafil-vs-tadalafil comparison, an onset & duration reference table, and a dose-strength reference chart (reclassified in from `09-retention-tools.md` — these are static reference content, not personalised tools) — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [x] Guides library: Travel & Practical articles — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [x] Guides library: Policy & News articles — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [x] Guides library: Managing Treatment articles — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [x] Side effects: Start Here articles — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [x] Side effects: **Urgent Warning Signs** articles (priapism, NAION, sudden hearing loss, chest pain, allergic reaction) — prioritise above all other content — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [x] Side effects: **Cardiovascular Safety Before Starting** articles — prioritise alongside Urgent Warning Signs — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [x] Side effects: **Dangerous Interactions** articles (nitrates, alpha-blockers, poppers, alcohol, grapefruit) — prioritise above all other content — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [x] Side effects: Common, non-urgent articles — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [x] Side effects: Vision & Hearing articles — source-checked draft written (2026-09-26); clinical sign-off tracked under "Named clinical reviewer" below
- [ ] IIEF-5 self-assessment explainer tool (clinical review required before publish) — **draft written** (`tools/iief-5`); stays open until clinically reviewed
- [ ] Cardiovascular pre-screening checklist tool (clinical review required before publish) — **draft written** (`tools/heart-health-checklist`); stays open until clinically reviewed
- [x] Trust hub: `trust/pharmacy-evidence` and `trust/editorial-policy` routes added to `ed-pages.ts` (evidence page deliberately replaces a composite "pharmacy score")
- [x] Trust hub: `trust/listing-disclaimer` and `trust/data-transparency` routes added to `ed-pages.ts`
- [x] Provider trust-page template (evidence, checked dates, unknown states) — `/ed/pharmacies/[slug]`: registration, checked evidence with dates, "Prices are being checked" empty state
- [x] `generateMetadata` on every public route (coming-soon preview copy; real content pending)
- [x] `app/sitemap.ts` generated from real routes (route-derived, excludes noindex previews)
- [ ] Named clinical reviewer assigned per published medical article

## Open questions

- Who is the named clinical reviewer, and what's their sign-off process/SLA? (Now more pressing given the urgent-warning-signs, cardiovascular-safety and interactions content must be clinically correct, not just well-sourced.)
- CMS choice, if the hybrid route is confirmed (Sanity, Contentful, etc.) — not yet evaluated.
- Does M1's ASA compliance review (§3) cover *educational* content the same way it covers price/promotion pages, or is condition/side-effect education already unambiguously safe to publish first, ahead of the price-list pages? Worth confirming so the Urgent Warning Signs / Dangerous Interactions content isn't blocked behind the same review gate as promotional pricing content.
- **IIEF-5 reproduction rights** — the IIEF-5/SHIM questionnaire is a validated clinical instrument; confirm whether reproducing its exact questions on a commercial site needs permission/licensing from the copyright holder before building the self-assessment tool, rather than assuming it's freely reusable because NHS pages reference it.
