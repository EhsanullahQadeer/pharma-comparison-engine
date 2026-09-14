# M4/M5 — Price Comparison Engine: Collection & Calculation

**Status:** ⬜ Not started
**Depends on:** M3a, M3b (need providers before prices)
**Roadmap:** [§ Milestone 4](../monj-functionality-and-ed-milestones.md#milestone-4--price-collection-and-freshness-monitoring), [§ Milestone 5](../monj-functionality-and-ed-milestones.md#milestone-5--comparison-calculations-filters-and-provider-pages)

## What we're building

Two connected pieces, deliberately split from provider data (M3b) because they're a different build/test concern:

1. **Collection** — repeatable, scheduled price/fee fetching per provider, with freshness rules and a validation/exception queue.
2. **Comparison engine** — the calculation that turns raw offers into a ranked, filterable comparison table, plus tests proving the arithmetic is right.

## How we're building it

### Collection

- Per roadmap §4.3, one of four methods per provider, in preference order: direct feed/API → approved affiliate feed → permitted page extraction → staff manual entry. Each provider gets exactly one active method, recorded on `Provider`.
- Scheduler + job queue (technology choice below) creates a job per source; workers fetch outside the request path (roadmap §4.4: `Scheduler → provider job queue → adapter → staging/validation → publish or review`).
- Freshness cadence from roadmap §4.5's table (direct feed every 4h, public-page every 12–24h, manual within 24h, etc.) stored as `nextDueAt` per provider/source.
- Freshness rule (roadmap §4.5): rank only totals verified within 24h; beyond 24h show stale/outside current-price ranking; beyond 48h suppress the number from the default view entirely while keeping history internally. Implement as a computed `isCurrentPriceEligible` check evaluated at query time, not a cron job that mutates rows — avoids races between "just verified" and "about to display."
- Validation guardrails before publish (roadmap §4.4): a price move over 20%, an implausibly low total, a new/unmapped variant, or a large unexplained drop in record count all route to staff review instead of auto-publishing.
- Every accepted change writes to `PriceHistory`; unchanged-but-successful checks go to an audit log, not history.

### Comparison engine

- Core formula (roadmap §4 "Fair price calculation"), computed server-side in **integer pence**:
  `deliveredTotal = itemPrice − applicableDiscount + delivery + mandatoryFees`
  `unitPrice = deliveredTotal / tabletCount`
- Only subtract a discount when its conditions are actually satisfied; an unknown fee must stay unknown, never silently become £0 (roadmap §2.3, §4.7).
- Compare strictly within matching ingredient + strength + formulation + pack size + purchase conditions; show brand distinctions explicitly rather than conflating generics.
- Filters: medicine, brand/generic, strength, formulation, pack quantity, delivery coverage, purchase model (roadmap §2.2 ED adaptation).
- Sorting must be deterministic — a stable tie-break (e.g. provider ID) so identically-priced offers don't reorder between identical queries.

### Testing

- Unit tests for the pricing formula against the roadmap's own worked example as fixed regression cases: an 8-tablet pack at £16 + £3 delivery = £19 total / £2.38 per tablet, vs. an equivalent pack at £18 inclusive = £18 / £2.25 per tablet.
- Unit tests for every row in the roadmap's §4.7 failure-scenario table (feed price vs. visible-price mismatch, recurring plans billing every 28 days vs. calendar month, expired discount, unknown stock, etc.) — each row is a test case, not just a design note.
- Integration test: seeded fake providers/offers (M3a's seeder) → comparison query → assert expected ranking and totals.

## Alternatives considered

**Collection infrastructure** (our own decision):

| Approach | Trade-off |
| --- | --- |
| **Vercel Cron + Route Handlers — recommended for pilot scale** | Zero extra infra, fits the current Next.js-shaped stack; limited native per-source backoff/queueing |
| Dedicated queue (BullMQ + Redis) | Real job queue with retries/backoff/concurrency control; adds Redis as a new dependency |
| Third-party workflow (Inngest, Trigger.dev) | Managed retries/scheduling; external SaaS dependency and cost |

Roadmap's own §4.6 estimate (50 providers × 20 variant pages × 2 checks/day ≈ 2,000 requests/day) is small enough that Vercel Cron is proportionate; revisit BullMQ/Inngest only if volume or retry complexity outgrows it.

**Collection method per provider** (roadmap §4.3 table):

| Method | Trade-off |
| --- | --- |
| Direct provider API/feed | Best structure if offered; needs agreement, may still omit checkout fees |
| Approved affiliate feed | Only covers contracted programmes/products; data may lag the pharmacy |
| Permitted website extraction | Per-site adapters, fragile to markup changes, rate limits |
| Staff verification/upload | Covers small/non-integrated providers; recurring labour, not real-time |

## Checklist

### Collection

- [ ] Scheduling infrastructure decided and stood up
- [ ] Per-provider source-adapter interface defined
- [ ] Direct-feed adapter (first real provider)
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

- Confirm scheduling-infra choice before building the first adapter — it shapes the adapter interface.
- Which real provider(s) will have a usable feed at pilot stage, versus needing manual entry from day one?
