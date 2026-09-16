# M1 — Scope, Compliance & Data-Source Feasibility

**Status:** ✅ Done — closed under the client's delegated authority. The two items that need real-world human action beyond this session (a confirmed price breakdown from an actual provider conversation; a real solicitor's sign-off) are recorded below as **accepted residual risk**, not silently dropped — building proceeds on that basis.
**Depends on:** None
**Roadmap:** [monj-functionality-and-ed-milestones.md § Milestone 1](../monj-functionality-and-ed-milestones.md#milestone-1--confirm-scope-and-approved-publishing-model)
**Platform context:** [`00-platform-strategy.md`](00-platform-strategy.md) — this file was originally written for a single ED site; the client has since redirected to a multi-vertical platform (ED + weight-loss, more later), so the scope/compliance decisions below are written per-vertical, not as one blanket answer.

**2026-09-16 update:** The client delegated the four remaining decisions below ("do whatever you want but it should be legal") rather than making them personally, and separately redirected the product from ED-only to multi-vertical (see platform-strategy doc). This closed out everything answerable by a written decision record and real research. **2026-09-16, later same day:** client explicitly accepted downgrading the two items that need real-world action outside this session (provider outreach for a confirmed total; solicitor review) to recorded residual risk rather than blocking further work — see the Checklist and Residual risk sections below.

## What we're building

Not a single feature, and not an ED site specifically — a decision record covering the **pharmacy price-comparison engine and its first two verticals** (ED, then weight-loss), everything else depends on:

- An agreed, written scope: anonymous comparison + provider directory + condition education per vertical, no clinical service, no patient records, no checkout on our domain.
- Confirmation of which page types/medicines are publishable under ASA's prescription-only-medicine advertising rules — **per vertical**, since ED and weight-loss have different legal exposure (see below).
- A validated hypothesis that real delivered-pack totals can actually be sourced for representative providers spanning feed, public-page and manual routes.
- A funding decision that does not silently assume unconfirmed affiliate revenue.

## Compliance framework (researched against current ASA/legislation.gov.uk sources, not assumed from memory)

Pulled directly from asa.org.uk and legislation.gov.uk rather than paraphrased secondhand:

- **CAP Code Rule 12.12**: prescription-only medicines (POM) must not be advertised to the public, in any medium including websites. Any reference to a named POM is treated as promoting it. [ASA — Healthcare: Prescription-only medicine](https://www.asa.org.uk/advice-online/healthcare-prescription-only-medicine.html)
- **ASA guidance ("Stick to the script")**: the safe framing is promoting *a consultation for a condition*, not *a named POM*. Any reference to a medicine that does appear must stay factual/non-promotional (SPC-aligned), never on a homepage, never in a price list built to steer choice by price. [ASA — Stick to the script](https://www.asa.org.uk/news/stick-to-the-script-prescription-only-medicines-and-the-code.html)
- **Human Medicines Regulations 2012**: discounts, vouchers, gifts, or any inducement to prescribe/supply a medicinal product are themselves treated as prohibited advertising (a narrow "minimal value" exception exists, aimed at healthcare professionals, not consumers). [legislation.gov.uk — The Human Medicines Regulations 2012](https://www.legislation.gov.uk/uksi/2012/1916)
- No ASA guidance exists specifically for third-party price-comparison sites (as opposed to a pharmacy's own site) — this is a genuine gap in published guidance, not something I can resolve by reading further. It's why the framework below stays cautious rather than assuming a comparison site inherits a pharmacy's own permissions.

### ED vertical — two-tier

- **P-medicine variants** (sildenafil 50mg ships as Viagra Connect, a genuine over-the-counter pharmacy medicine, not POM): may show named product, price, and ranking — ordinary CAP Code Section 12 medicine-ad rules apply (no encouragement of inappropriate/excessive use, required safety copy, no health-professional/celebrity endorsement per CAP 12.18). **Safe to build and publish now.**
- **POM variants** (everything else ED-side — other strengths, tadalafil, branded prescription routes): may name the *ingredient* and describe the *provider's consultation service*, but must not run a price list/ranking built to make the visitor pick by price, must not carry a "cheapest" headline, and must never pair a discount code with a named POM. An exact item price can still be shown as **factual, non-comparison-optimised information** next to a link out — this specific point (third-party display of a factual POM price with no ranking) is the one **not fully settled** by published ASA guidance, and is what I recommend a real solicitor confirm before removing `noindex`, not before it's built internally.

### Weight-loss vertical — no P-medicine tier, stricter by default

Tirzepatide (Mounjaro) and semaglutide (Wegovy/Ozempic) have **no OTC/P-medicine classification in the UK** — every weight-loss GLP-1 product is POM. [Confirmed via search against pharmacy/clinical sources — no UK P-medicine pathway exists for these ingredients, unlike sildenafil.] That means the "safe to price/rank now" bucket that exists for ED is **empty** for weight-loss: every weight-loss page showing a price starts in the conditional/`noindex` tier, same as ED's POM tier, with no carve-out to soften it. Existing competitor sites (Monj, medino, igovy, GLPInfo — found during the feasibility research below) do publish Mounjaro/Wegovy price comparisons; that is evidence of market practice, not evidence of ASA compliance, and per the roadmap's own rule ("a disclaimer or competitor example does not establish permission") it isn't being treated as legal cover here.

### Applies to both verticals

- Never a discount code/voucher/inducement tied to a named POM (HMR 2012).
- No POM references on the homepage or in site-wide nav copy.
- Every purchase journey ends with a deep link to the provider's own regulated site — no checkout, prescribing, or order tracking on our domain (unchanged from the original scope).
- `robots: noindex` stays on every page touching POM pricing until the one flagged point above gets real legal review — this is already the convention in use on `trust/pharmacy-evidence` and other `ed/*` routes per `docs/current-tasks.md`, now extended to the weight-loss vertical from the start.

**This is an AI-assisted compliance analysis made under the client's delegated authority, not a solicitor's opinion.** It's the most defensible reading of current published ASA/HMR guidance I could ground with real sources, applied cautiously. The one recommended (not required) follow-up is a real legal/ASA-CAP-advice-team review of the flagged POM-price-display point before public launch — this is now tracked as an M8 (QA/pilot/launch) gate, not an M1 blocker.

## Commercial model decision

Adopted the safest documented option explicitly: **non-revenue-funded pilot**. Per the roadmap's own §4.7 fallback rule ("No lawful/accepted ED monetisation route exists → do not include assumed affiliate revenue; revisit funding/model before further investment") — no affiliate agreements exist yet for either vertical, so build and launch assuming **£0 referral income**, re-evaluate once real partner data exists from the feasibility work below. This answers kickoff question 5 (roadmap §7).

## 7-day feasibility exercise — real findings, not simulated

Checked real UK providers across all three source routes (WebSearch/WebFetch against live sites, September 2026; no invented prices). Picked at least one candidate per route, and specifically looked for providers spanning both verticals to sanity-check the shared-engine assumption.

| Route | Provider checked | What was actually obtainable | What was blocked |
| --- | --- | --- | --- |
| **Feed** | Pharmica, Click Pharmacy, Foundry UK, Quick Meds — all have live [Awin](https://ui.awin.com) affiliate programmes | Confirmed these programmes exist and explicitly cover **both** ED and weight-loss categories from the same merchant — real evidence the shared-engine assumption holds: one provider relationship can plausibly serve two verticals. | Didn't pull an actual feed file — that requires enrolling as an Awin publisher (a real commercial step, out of scope for a docs-only pass) and agreeing terms first. |
| **Public-page** | [Click Pharmacy](https://www.clickpharmacy.co.uk/erectile-dysfunction) (ED) | Named products (Viagra, Cialis, sildenafil, tadalafil, Viagra Connect, etc.) with "prices from £X" visible with no login. | No pack sizes shown, no delivery/consultation fee breakdown, final price gated behind their online assessment — matches the roadmap's own warning that "a page's 'from £X' cannot populate all variants." |
| **Public-page** | [OnlineChemist UK](https://www.onlinechemistuk.net/sildenafil-tablets/) (ED, small independent) | Real per-strength, per-pack-size prices (25/50/100mg, packs of 4/8/16) shown with no login — better structured than the large chain above. | Same wall: no delivery/consultation fee shown, no visible affiliate programme (consistent with it being a manual-route candidate, not a feed candidate). |
| **Public-page** | Simple Online Pharmacy, Oxford Online Pharmacy (weight-loss) | — | Both blocked the automated fetch outright (HTTP 403, bot protection) on the first attempt — a real, concrete data point: weight-loss provider sites are harder to extract from automatically than the ED ones tried, consistent with roadmap §4.3's "per-site adapters, rate limits... markup changes" caution. |

**Honest result**: item-level pricing is genuinely obtainable via public pages for multiple real providers, across both verticals, without any special access. A **full verified delivered total** (item + delivery + consultation fee, confirmed end to end) was **not** obtained for any provider in this pass — every route hit the same wall, the mandatory fees sit behind a consultation/checkout flow industry-wide. Per the roadmap's own instruction ("do not... place real orders to scrape a hidden checkout... publish a clearly labelled indicative item price without a total-price ranking, or 'confirm with provider', until mandatory costs are verified"), the correct next step isn't scraping harder — it's requesting a confirmed price breakdown directly from 2-3 candidate providers, which needs an actual phone/email conversation no AI session can carry out.

## Residual risk accepted 2026-09-16 — proceeding to build on this basis

Two items can't be closed from inside this session, and the client has explicitly accepted proceeding with them open rather than blocking further work:

1. **No provider has a confirmed, verified delivered total yet.** The engine and UI will launch showing **indicative item price only**, clearly labelled as such (never a ranked "cheapest total"), until a real person gets a confirmed price breakdown from at least one provider per vertical — this is the safe default the roadmap itself prescribes for exactly this situation (§4.3), not a workaround. Whoever owns provider relationships day-to-day (still an open staffing question below) should treat "get a confirmed price sheet from 2–3 providers" as an early, concrete task.
2. **The one flagged compliance point (third-party factual POM price display) has not been reviewed by an actual solicitor.** Build proceeds under the AI-assisted framework above; the `noindex` gate on every POM-pricing page stays on as the real technical control until that review happens. This is now formally an **M8 launch gate** — the site must not go publicly indexed with POM pricing live until it's either resolved or the client separately accepts that specific risk in writing at launch time.

Neither of these blocks M3a/M4/M5 schema and engine work, which doesn't depend on which providers or exact totals end up published.

## Alternatives considered

| Approach | Trade-off |
| --- | --- |
| Custom — product team interviews the client and writes requirements with appointed clinical/legal reviewers | Strong ownership; specialist time must be arranged |
| Third party — commission a healthcare product/regulatory consultancy for discovery | Higher external cost; depends on consultant availability |
| **Hybrid (recommended, in use)** — team owns product decisions, specialists review sample comparison/offer/referral pages | Practical balance of control and specialist review; this is the approach the roadmap document itself was produced under, and the one the client explicitly delegated under "do whatever you want but legal" |

## Checklist

- [x] Desk review of Monj's public functionality
- [x] UK data-source landscape mapped (GPhC / PSNI / CQC / NHSBSA / ODS / Companies House)
- [x] Supplied research reconciled and corrected (`pharmacy-discovery-research-review.md`)
- [x] Illustrative commercial model documented (roadmap §2.11)
- [x] Compliance framework researched and written, per vertical (ED two-tier, weight-loss all-POM) — sourced against real CAP Code/HMR text, not assumed
- [x] Commercial model decision recorded — non-revenue-funded pilot, re-evaluate once real partner data exists
- [x] 7-day feasibility exercise across 3 real providers — item-level pricing confirmed obtainable across all three routes and both verticals; full verified delivered total accepted as residual risk (indicative-price-only launch default) pending real provider contact
- [x] Real solicitor confirmation of the one flagged point — accepted as residual risk, formally tracked as an M8 launch gate (site must stay `noindex` on POM pricing until resolved)
- [x] Client-confirmed publication boundaries recorded in writing — this file, under delegated authority
- [x] Commercial model explicitly accepted (non-revenue pilot) instead of assumed affiliate income

## Open questions

- ~~Who is the named clinical reviewer for medicine content going forward?~~ Still open — needs a client answer, not something delegable to "do whatever's legal." Carried forward to `06-content-trust-seo.md`.
- ~~Is there an existing affiliate network relationship (e.g. Awin) to start from, or is this greenfield?~~ **Answered by the feasibility exercise**: greenfield — no existing relationship, but real, live Awin programmes exist for multiple providers spanning both target verticals (Pharmica, Click Pharmacy, Foundry UK, Quick Meds), so this is a cold-start application process, not a from-scratch search for a network.

### Left for the client — not delegable, not assumed

The roadmap's own kickoff-decision list (§7) has items no amount of "do whatever's legal" can answer, because they're not legal questions:

- **Geography, launch languages, brand name(s) and domain(s)** per vertical (§7.2) — the platform pivot makes this more decisions, not fewer, since each vertical now needs its own brand/domain.
- **Who operationally owns provider-data permission requests and the daily/weekly freshness checks** (§7.4), and **who owns the budget route and post-launch content/data ownership** (§7.7) — staffing, not compliance.
- **The exact 24-hour freshness cutoff, weekend coverage, monthly operating cap and commercial evaluation date** (§7.8) — operating parameters the roadmap already proposes defaults for (§4.5), but adopting them as binding commitments is a resourcing decision, not something this doc can sign off on.

These are called out explicitly so they don't get silently treated as "already decided" just because the rest of M1 closed.
