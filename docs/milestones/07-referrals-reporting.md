# M7 — Provider Links & Corrections; Optional Future Commercial Reporting

**Status:** ⬜ Not started
**Depends on:** M1, M3, M5
**Roadmap:** [monj-functionality-and-ed-milestones.md § Milestone 7](../monj-functionality-and-ed-milestones.md#milestone-7--external-referrals-corrections-and-reporting)

## What we're building

**Confirmed scope (2026-09-16):** the product is an independent price-comparison engine for users, with no referral partners at launch. Plain provider links and corrections are core scope. Affiliate attribution and commercial reporting below are deferred options only, not launch gates or committed next steps. Any future commercial arrangement must leave inclusion, price ranking and visual prominence unchanged; no paid placement or partner promotion is part of this milestone.

- Outbound "go to provider" links that are validated, and tracked where an approved affiliate agreement exists — but never allowed to influence ranking.
- A public correction-report inbox with a named owner and an audit trail.
- Optional later commercial reporting, only if actual agreements justify it: pending → approved → paid reconciliation, per roadmap §2.10.

## How we're building it

- `Referral` model (M3a) stores a non-sensitive offer reference, destination and aggregate counts only — never patient data. Roadmap §2.10 explicitly prohibits sending health details, free-text searches or sensitive preferences into affiliate URL parameters.
- **Destination validation** — the outbound link target must be a reviewed, approved provider destination; anything else is rejected server-side before redirect. This closes the same SSRF-shaped risk the roadmap flags for collectors in §4.4 (a submitted URL must not make our server fetch internal/private addresses).
- Where an affiliate programme is accepted: implement its specific attribution method (tracked link or signed callback), deduplicate by transaction ID, and support reversals so retries never double-count income (roadmap §2.10).
- Where no programme is accepted for a provider: a plain outbound link, zero assumed commission recorded — **ranking must be identical either way**. Roadmap §4.7 is explicit: "cheapest provider pays no commission → show its correct position; revenue forecast uses actual paying-partner click share."
- `Correction` model: reported issue → assigned owner → resolution → audit record. The public correction form writes directly into this.
- Commercial reporting view (admin, commercial-manager role): pending/approved/paid states per referral, matching roadmap §2.10's flow (`visitor → tracked link → provider checkout → eligible transaction reported → pending commission → validation/reversal → payable amount → settlement`).

## Alternatives considered

| Approach | Trade-off |
| --- | --- |
| Custom — destination validation, click counts, correction inbox, commercial reports built in-app | Strong control; partner reconciliation remains manual work |
| Third party — affiliate network + its own reporting/support services | Less infrastructure to build; programme acceptance and permitted tracking vary by network |
| **Hybrid (recommended by roadmap)** — own destinations, ranking and disclosures; use partner reports for actual attributed sales | Keeps comparison independent; sales visibility may be incomplete |

## Checklist

- [ ] `Referral` model + destination validation
- [ ] Outbound click logging (aggregate, non-sensitive)
- [ ] Deferred, optional: affiliate attribution integration if an eligible programme is accepted
- [ ] Deferred, optional: deduplication + reversal handling for commission events
- [ ] Public correction-report form
- [ ] Correction review queue with named owner + audit trail
- [ ] Deferred, optional: commercial reporting dashboard (pending / approved / paid)
- [ ] Verified: ranking is identical for partner vs. non-partner providers

## Open questions

- No affiliate-network selection is needed for launch. Revisit only if a future agreement supports the independent comparison service without influencing results.
- Who holds the "named escalation owner" role for credible safety/identity concerns (roadmap §2.11 service target)?
