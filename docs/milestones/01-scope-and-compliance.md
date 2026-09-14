# M1 — Scope, Compliance & Data-Source Feasibility

**Status:** 🟨 In progress (research complete, sign-off pending)
**Depends on:** None
**Roadmap:** [monj-functionality-and-ed-milestones.md § Milestone 1](../monj-functionality-and-ed-milestones.md#milestone-1--confirm-scope-and-approved-publishing-model)

## What we're building

Not a feature — a decision record everything else depends on. Before any comparison page or price ships, we need:

- An agreed, written scope: anonymous ED comparison site, no clinical service, no patient records (roadmap §1, §3).
- Confirmation of which page types/medicines are publishable under ASA's prescription-only-medicine advertising rules (roadmap §3 "Public medicine information and promotions").
- A validated hypothesis that real delivered-pack totals can actually be sourced for at least 3 representative providers spanning feed, public-page and manual routes.
- A funding decision that does not silently assume unconfirmed affiliate revenue (roadmap §2.11).

## How we're building it

1. **Desk research (done)** — reviewed Monj's public functionality end to end, mapped the UK data-source landscape (GPhC, PSNI, CQC, NHSBSA, NHS ODS, Companies House), and reconciled two supplied research documents into [`pharmacy-discovery-research-review.md`](../pharmacy-discovery-research-review.md).
2. **7-day feasibility exercise (not started)** — pick 3 real providers spanning feed/public-page/manual, attempt to build one verified delivered-total each, log time spent and blockers hit.
3. **Legal/compliance pass (not started)** — confirm with client/legal which pages can go live under ASA guidance: condition education is always safe; price lists, discount codes and product-specific search pages are conditional scope.
4. **Commercial model sign-off (not started)** — client explicitly accepts the illustrative economics in the roadmap (§2.11) and agrees a non-revenue-funded pilot is acceptable if affiliate agreements don't land in time.

## Alternatives considered

| Approach | Trade-off |
| --- | --- |
| Custom — product team interviews the client and writes requirements with appointed clinical/legal reviewers | Strong ownership; specialist time must be arranged |
| Third party — commission a healthcare product/regulatory consultancy for discovery | Higher external cost; depends on consultant availability |
| **Hybrid (recommended, in use)** — team owns product decisions, specialists review sample comparison/offer/referral pages | Practical balance of control and specialist review; this is the approach the roadmap document itself was produced under |

## Checklist

- [x] Desk review of Monj's public functionality
- [x] UK data-source landscape mapped (GPhC / PSNI / CQC / NHSBSA / ODS / Companies House)
- [x] Supplied research reconciled and corrected (`pharmacy-discovery-research-review.md`)
- [x] Illustrative commercial model documented (roadmap §2.11)
- [ ] 7-day feasibility exercise across 3 real providers (feed / public-page / manual)
- [ ] ASA/legal sign-off on which page types can launch
- [ ] Client-confirmed publication boundaries recorded in writing
- [ ] Commercial model explicitly accepted, or non-revenue pilot explicitly agreed instead

## Open questions

- Who is the named clinical reviewer for medicine content going forward?
- Is there an existing affiliate network relationship (e.g. Awin) to start from, or is this greenfield?
