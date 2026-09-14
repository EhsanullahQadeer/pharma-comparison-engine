# M10 — Optional: Clinical-Service Expansion

**Status:** ⬜ Not started (separate business decision, not required for M8 launch)
**Depends on:** Named regulated clinical partner(s) + governance in place; independent of M8
**Roadmap:** [monj-functionality-and-ed-milestones.md § Milestone 10](../monj-functionality-and-ed-milestones.md#milestone-10--optional-clinical-service-expansion)

## What we're building

Nothing yet, and not as an extension of the comparison codebase. This file exists only to flag that if the business later decides to move from "compare and hand off" to "assess and dispense," it is a fully separate, much larger scope: patient identity, clinical assessment, prescribing, pharmacy fulfilment, payment/refunds, dispatch, follow-up.

## How it would be built (if chosen)

- Would need its own roadmap, estimate and regulated clinical partner(s) — not a bolt-on to the comparison product's existing `Provider`/`Offer` models.
- The main roadmap document deliberately separates this: an earlier, limited-access clinical-service concept exists as its own document and is explicitly superseded by the comparison-first plan for the current build. Treat that earlier document as a starting point only if this milestone is ever activated.

## Alternatives considered

| Approach | Trade-off |
| --- | --- |
| Custom — patient/clinician/pharmacy workflows built with the client's authorised clinical operation | Highest control, responsibility, cost and delivery uncertainty |
| Third party — contracted white-label clinical service supplying the regulated journey | Quicker only if suitable; vendor controls much of the experience and economics |
| **Hybrid (recommended by roadmap, if expansion is chosen)** — keep the public experience custom, integrate a contracted clinical/dispensing system | Shared responsibility must be explicit; integration remains substantial |

## Checklist

- [ ] Business decision made to pursue clinical expansion (currently: no)
- [ ] Regulated clinical partner(s) identified and contracted
- [ ] Clinical governance structure defined
- [ ] Separate roadmap/estimate produced
- [ ] Identity → assessment → clinician review → prescribing → pharmacy checks → payment/refund → dispatch → follow-up proven end to end

## Open questions

- Not applicable until the business decision above is made.
