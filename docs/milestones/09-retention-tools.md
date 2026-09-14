# M9 — Optional: Retention & Useful Tools

**Status:** ⬜ Not started (optional — only after launch, on evidence of demand)
**Depends on:** Stable M8 release + a fresh privacy/content review
**Roadmap:** [monj-functionality-and-ed-milestones.md § Milestone 9](../monj-functionality-and-ed-milestones.md#milestone-9--optional-retention-and-useful-tools)

**2026-09-14 update:** Monj's "Tools" mega-menu (BMI/BMR calculators, dose-click charts, a medication comparison tool, tracker apps) sits in **top-level navigation**, not behind a "maybe later" flag — it's core to the product, not a retention add-on. Reviewing that changed how this file is scoped: tools that are pure information (no personalisation, no dose recommendation) have been **moved out of this file** into M5/M6 as core launch scope. What's left here is genuinely optional, requires accounts/consent, or edges closer to personalised recommendation than the roadmap's constraints allow.

## Reclassified out of M9 (now core scope elsewhere)

| Tool | Now lives in | Why it's core, not optional |
| --- | --- | --- |
| Compare Medications (sildenafil vs. tadalafil vs. others, side by side) | M6 content / M5 comparison UI | Pure informational comparison — the actual product |
| Onset & duration reference (how long each takes to work / lasts) | M6 content | Static reference facts, not personalised |
| Dose-strength reference chart (25/50/100mg sildenafil, 10/20mg tadalafil) | M6 content | Must be explicitly labelled "reference, not a recommendation — your prescriber decides your dose," but the chart itself is core content, same spirit as Monj's click-charts |
| Pack-cost / price calculator | M5 (this **is** the price comparison engine) | Already fully scoped there — not a separate build |
| IIEF-5 self-assessment explainer, cardiovascular pre-screening checklist | M6 content | ED-specific safety/self-understanding tools, not adapted from Monj at all — both output general clinical information for the user's own understanding, never a product recommendation, which is exactly why they're core rather than optional (see below for the contrast with the quiz that *does* stay out of scope) |

## What's actually optional here

Only what users request post-launch, and only with a named owner and success criterion — this file holds the shape of the candidates, it doesn't commit to building them.

- **Saved comparisons** (requires accounts)
- **Price-alert notifications** (requires accounts + consent flow)
- **Symptom/dose tracker app** (Monj's DoseDiary/Glapp-equivalent) — meaningful build, overlaps with health-data handling, needs its own privacy review before even being scoped
- **Community / moderated forum** — explicitly deferred per the main roadmap; Monj's forum has no ED equivalent planned
- **"Which treatment fits your routine?" personalisation quiz** — see below, the highest-risk item on this list

### The personalisation-quiz problem

Monj-style sites often offer an interactive quiz ("planned or spontaneous use? how often?") that steers a visitor toward a specific product. For ED medication this sits close to the roadmap's hard constraint: **no tool may recommend a dose or present a diagnosis.** A quiz that outputs "tadalafil suits you better" is a recommendation, even if it's phrased softly.

- The **safe version** — a neutral comparison table of lifestyle factors (e.g. "sildenafil: shorter window, taken as needed" vs. "tadalafil: longer window, more flexible timing") with no personalised output — is just content, and already covered by the "Sildenafil vs tadalafil" guide in M6.
- The **quiz/recommendation-engine version** stays out of scope indefinitely unless a clinician-reviewed, non-diagnostic design is specifically signed off — this is a product/legal decision, not something to build speculatively.
- Contrast this with the IIEF-5 and cardiovascular-checklist tools reclassified into M6 above: those output a **standard clinical score or a "speak to a doctor" flag**, never a product name — that's the line between "informational self-assessment tool" (core, build it) and "personalised recommendation engine" (optional at best, needs sign-off).

## How we're building it (if greenlit)

- Every addition needs evidence of demand, a named owner, and a measurable success criterion before work starts — no speculative building.
- No tool may recommend a dose or present a diagnosis. Hard constraint, not a style preference — see the personalisation-quiz discussion above for the concrete edge case this actually bites on.
- Any account or notification feature triggers a fresh privacy review before build starts — this is explicitly gated, not assumed to be fine because M8 already had a privacy pass.

## Alternatives considered

| Approach | Trade-off |
| --- | --- |
| Custom — saved comparisons, tracker app, preference controls | Product control; accounts/preferences add privacy obligations |
| Third party — integrate a suitable notification/community service | Faster delivery; moderation, health-data handling and exports need review |
| **Hybrid (recommended by roadmap, if needed)** — keep simple tools local, add managed communications only after consent and delivery requirements are agreed | Limits initial data collection; advanced personalisation is delayed |

## Checklist

- [ ] Post-launch demand signal captured (which feature, how measured)
- [ ] Fresh privacy review completed before any account/notification feature starts
- [ ] Saved comparisons (if prioritised — requires accounts)
- [ ] Price-alert notifications (if prioritised — requires a consent flow)
- [ ] Symptom/dose tracker app (if prioritised — requires its own privacy review, treat as a separate mini-milestone, not a quick add)
- [ ] Personalisation quiz — explicit clinician/legal sign-off obtained before any build starts (default: don't build)
- [ ] "No dose/diagnosis" constraint verified in every shipped tool

## Open questions

- None yet for the reclassified-out tools — see M5/M6 for their open questions.
- For the tools remaining here: is a symptom/dose tracker actually differentiated from just linking to an existing NHS-endorsed app, given the privacy overhead of building our own?
