# M4/M5 — Price Comparison Engine: Collection & Calculation

**Status:** ⬜ Not started
**Depends on:** M3a (including the reopened `ProductCategory`/history items), M3b (need providers before prices)
**Roadmap:** [§ Milestone 4](../monj-functionality-and-ed-milestones.md#milestone-4--price-collection-and-freshness-monitoring), [§ Milestone 5](../monj-functionality-and-ed-milestones.md#milestone-5--comparison-calculations-filters-and-provider-pages)
**Platform context:** [`00-platform-strategy.md`](00-platform-strategy.md) — this collection/calculation engine is the platform's core reusable asset per the 2026-09-16 pivot, deployed once per brand and never rebuilt per vertical. Nothing in this file's design was ED-specific; the only change is that comparisons must stay scoped within a single `ProductCategory` (never compare an ED variant against a weight-loss one) and offer/discount history (M3a item 2) should be written wherever price history already is.

## What we're building

Two connected pieces, deliberately split from provider data (M3b) because they're a different build/test concern:

1. **Collection** — repeatable, scheduled price/fee fetching per provider, with freshness rules and a validation/exception queue.
2. **Comparison engine** — the calculation that turns raw offers into a ranked, filterable comparison table, plus tests proving the arithmetic is right.

## How we're building it

### Confirmed launch assumptions (2026-09-16)

- Hosting is a VPS. Use a standalone Node.js scheduler/worker with `node-cron`; Vercel Cron is not the deployment target.
- Launch has no referral partners. Start with permitted public-page extraction and staff verification/import. Direct feeds and affiliate feeds are optional later integrations, not completion or launch requirements.
- Ordinary outbound provider links work without referral tracking. Assume zero referral revenue in the launch budget; provider inclusion and price order must not depend on commercial partnership.
- Collection/reuse permission is separate from referral partnership. No affiliate agreement does not itself prohibit a factual listing, but a public page does not automatically grant scraping or republication rights. Retain the existing source-permission and medicine-publication review gates.
- Publicly evidenced promotions may be recorded with their exact terms where permitted; do not assume exclusive partner codes, commissions or verified discount applicability. Unknown fees remain unknown; launch with indicative item prices where a complete total cannot be established.

### VPS scheduling

- Run the web app and collection worker as separate processes. Supervise the worker with systemd (or the deployment's existing process manager), with restart-on-failure and boot startup. Never register cron from a page, layout, request handler or every web replica.
- A short `node-cron` tick (initial proposal: every minute, UTC) checks persisted due work; it does not scrape every provider each minute. Use `noOverlap` for the local scheduling callback and database claims/leases for cross-process safety. Node-cron supports timezone, overlap prevention and jitter: [official options](https://nodecron.com/scheduling-options.html).
- Store source cadence, `nextDueAt`, job status, attempt count, next retry, lease expiry and last success in Postgres. On startup and each tick, reconcile overdue work in bounded batches. Deduplicate jobs and reject older observations arriving after newer accepted data. Cron timers alone do not provide durable recovery.
- Begin with one scheduler and bounded worker concurrency; limit requests per domain and browser resource usage so collection does not starve the website on the same VPS. Track worker heartbeat, queue age, failures and stale coverage; provide graceful shutdown and an explicit manual run for development. Development collection is opt-in and must not accidentally duplicate production jobs.
- Start permitted page checks around every 12 hours where source limits allow, leaving retry margin before the 24-hour freshness boundary. Retry transient failures with the existing 5/15/60-minute policy plus jitter, respecting server retry instructions. Access blocks and extraction failures enter review rather than endless retry.

### Collection

- Launch source priority: permitted page extraction → staff verification/import. Add agreed direct feeds and approved affiliate feeds when actually available. Allow separate price, delivery and promotion sources per provider, with explicit authority per field/purchase context and conflicts routed to review; never silently choose the cheapest conflicting source.
- Scheduler + job queue (technology choice below) creates a job per source; workers fetch outside the request path (roadmap §4.4: `Scheduler → provider job queue → adapter → staging/validation → publish or review`).
- Freshness cadence from roadmap §4.5's table (direct feed every 4h, public-page every 12–24h, manual within 24h, etc.) stored as `nextDueAt` per provider/source.
- Freshness rule (roadmap §4.5): rank only totals verified within 24h; beyond 24h show stale/outside current-price ranking; beyond 48h suppress the number from the default view entirely while keeping history internally. Implement as a computed `isCurrentPriceEligible` check evaluated at query time, not a cron job that mutates rows — avoids races between "just verified" and "about to display."
- Validation guardrails before publish (roadmap §4.4): a price move over 20%, an implausibly low total, a new/unmapped variant, or a large unexplained drop in record count all route to staff review instead of auto-publishing.
- Every accepted change writes to `PriceHistory`; unchanged-but-successful checks go to an audit log, not history.

### Comparison engine

- **Primary purpose: independent price comparison for users.** Default order is lowest eligible comparable price first. For verified-total comparisons, use delivered total; incomplete-cost offers remain clearly labelled indicative listings outside that ranking. Verification, availability, freshness and exact-product matching are eligibility gates, not ranking weights.
- Commercial status, commission, affiliate tracking and payment must never influence inclusion, ordering, tie-breaks, refresh priority, badges or visual prominence. No sponsored positions or paid boosts. Collection priority follows freshness, failures and user demand rather than potential revenue.
- Show the comparison basis, fee breakdown, applicable discount conditions, last verification and coverage limitations. A price position is not an endorsement of clinical quality. Provide a correction route so users can challenge inaccurate data.

- Core formula (roadmap §4 "Fair price calculation"), computed server-side in **integer pence**:
  `deliveredTotal = itemPrice − applicableDiscount + delivery + mandatoryFees`
  `unitPrice = deliveredTotal / tabletCount`
- Only subtract a discount when its conditions are actually satisfied; an unknown fee must stay unknown, never silently become £0 (roadmap §2.3, §4.7).
- Compare strictly within matching product category + ingredient + strength + formulation + pack size + purchase conditions; show brand distinctions explicitly rather than conflating generics. Category is the outermost boundary — an ED variant and a weight-loss variant are never comparable, regardless of any other matching fields.
- Filters: medicine, brand/generic, strength, formulation, pack quantity, delivery coverage, purchase model (roadmap §2.2 ED adaptation).
- Sorting must be deterministic — a stable tie-break (e.g. provider ID) so identically-priced offers don't reorder between identical queries.

### Testing

- Unit tests for the pricing formula against the roadmap's own worked example as fixed regression cases: an 8-tablet pack at £16 + £3 delivery = £19 total / £2.38 per tablet, vs. an equivalent pack at £18 inclusive = £18 / £2.25 per tablet.
- Unit tests for every row in the roadmap's §4.7 failure-scenario table (feed price vs. visible-price mismatch, recurring plans billing every 28 days vs. calendar month, expired discount, unknown stock, etc.) — each row is a test case, not just a design note.
- Integration test: seeded fake providers/offers (M3a's seeder) → comparison query → assert expected ranking and totals.
- Independence regression: changing only affiliate/commission status leaves provider inclusion, prices, ordering and presentation unchanged; the cheapest eligible non-partner stays first. Equal prices use the same neutral tie-break. Verify incomplete totals never outrank complete totals by substituting zero fees.

## Alternatives considered

**Collection infrastructure** (our own decision):

| Approach | Trade-off |
| --- | --- |
| **VPS Node.js worker + node-cron + Postgres jobs — selected for pilot** | Fits confirmed hosting, reuses Postgres; requires process supervision, durable claims/retries and monitoring |
| Dedicated queue (BullMQ + Redis) | Real job queue with retries/backoff/concurrency control; adds Redis as a new dependency |
| Third-party workflow (Inngest, Trigger.dev) | Managed retries/scheduling; external SaaS dependency and cost |

Roadmap §4.6's 50 providers × 20 variant pages × 2 checks/day ≈ 2,000 checks/day is an illustrative future workload, not measured launch coverage. Begin with 3–5 providers and benchmark HTTP/browser resource use plus staff review time on the VPS. Revisit BullMQ or managed workflows when operational complexity justifies them; Redis is not required for the first pilot.

**Collection method per provider** (roadmap §4.3 table):

| Method | Trade-off |
| --- | --- |
| Direct provider API/feed | Best structure if offered; needs agreement, may still omit checkout fees |
| Approved affiliate feed | Only covers contracted programmes/products; data may lag the pharmacy |
| Permitted website extraction | Per-site adapters, fragile to markup changes, rate limits |
| Staff verification/upload | Covers small/non-integrated providers; recurring labour, not real-time |

## Checklist

### Collection

- [x] Scheduling approach decided: VPS Node.js worker + node-cron + Postgres jobs
- [ ] Worker implemented and supervised; durable claims, retries and overdue-work recovery verified
- [ ] Per-provider source-adapter interface defined
- [ ] Optional post-launch: direct/affiliate-feed adapter when real access and applicable rights exist (not a launch gate)
- [ ] Public-page extraction adapter (first real provider)
- [ ] Manual price-entry flow (staff)
- [ ] Freshness (`nextDueAt`) tracking per source
- [ ] 24h/48h staleness rule enforced at query time
- [ ] Validation guardrails (>20% move, new mapping, etc.) routing to review
- [ ] `PriceHistory` written on every accepted change
- [ ] Retry/backoff for transient failures (5 / 15 / 60 min per roadmap §4.5)
- [ ] Seven consecutive days of production-like runs with no data corruption (roadmap's M4 completion bar)

### Comparison engine

- [ ] `deliveredTotal` / `unitPrice` calculation implemented in integer pence
- [ ] Filter set implemented (medicine, brand/generic, strength, formulation, pack, delivery, purchase model)
- [ ] Deterministic sort/tie-break
- [ ] "Unknown fee never becomes zero" invariant enforced and tested
- [ ] Regression tests from the roadmap's worked examples
- [ ] Test coverage for every roadmap §4.7 failure scenario
- [ ] Comparison page UI wired to the engine (depends on M2 routes existing)

## Open questions

- Which 3–5 providers have permitted, maintainable public sources for the first pilot, and which fields need staff verification?
- What VPS memory/CPU budget and existing process manager are available? Measure browser capacity before increasing concurrency.
- What monthly collection/verification budget can be sustained with zero referral income? Reassess optional partnerships after useful coverage and traffic exist.
