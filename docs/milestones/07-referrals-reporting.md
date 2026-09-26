# M7 — Provider Links & Corrections; Optional Future Commercial Reporting

**Status:** 🟩 Mostly complete — all non-optional items are done (corrections 2026-09-26; tracked outbound links, click analytics and the independence test 2026-09-26). Only the deferred, optional affiliate items remain, blocked on the client decisions in [`../referral-earnings-plan.md`](../referral-earnings-plan.md) §2/§7.
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

## Build plan (2026-09-26)

Full earnings design: [`../referral-earnings-plan.md`](../referral-earnings-plan.md). This milestone's non-optional items are that plan's Phase 1, and don't need any partner:

1. **Schema.** Replace the unused `Referral` scaffold with `ReferralClick`: offer, provider and variant references, placement (compare / ingredient prices / pharmacy profile / repeat costs), rank shown, bot flag, a visitor hash that rotates daily (and is cleared after 24h), and a timestamp. It stores no IP, user agent, cookie or search terms.
2. **`/go/[offerId]` route handler.** Redirects only when the offer is published, its provider is `PUBLISHED`, and the stored `sourceUrl` is `https` on the provider's own domain (or a subdomain). Anything else goes to `/ed/compare` and is not logged. Response headers: `no-store`, `noindex`, `Referrer-Policy: origin`. The click is written after the redirect with `after()`.
3. **Bot filtering.** Crawler user agents, prefetch headers, and more than 20 clicks per visitor hash per hour are flagged as likely bots. They're still redirected but excluded from reports.
4. **Offer buttons.** The table and cards link to `/go/…` with placement and rank, using `rel="nofollow sponsored noopener"`, and `robots.ts` disallows `/go/`.
5. **Admin.** `/admin/analytics` gains clicks per day (people vs filtered bots), clicks by pharmacy, and the share of clicks that went to the #1-ranked offer.
6. **Independence test.** Ranking output is unchanged when affiliate status differs between providers.

Phases 2–4 (programmes, commission import/reconciliation, earnings reporting) stay blocked on the client decisions listed in the plan's §2 and §7.

## Alternatives considered

| Approach | Trade-off |
| --- | --- |
| Custom — destination validation, click counts, correction inbox, commercial reports built in-app | Strong control; partner reconciliation remains manual work |
| Third party — affiliate network + its own reporting/support services | Less infrastructure to build; programme acceptance and permitted tracking vary by network |
| **Hybrid (recommended by roadmap)** — own destinations, ranking and disclosures; use partner reports for actual attributed sales | Keeps comparison independent; sales visibility may be incomplete |

## Checklist

- [x] `Referral` model + destination validation — `ReferralClick` (migration `20260926111027_referral_clicks`, replacing the unused `Referral` scaffold); `/go/[offerId]` (`src/app/go/[offerId]/route.ts`) redirects only for a published offer from a `PUBLISHED` provider whose `sourceUrl` is https on the provider's own domain (`isAllowedDestination`, `src/lib/referrals.ts`), otherwise to `/ed/compare`. All 122 published offers passed the check.
- [x] Outbound click logging (aggregate, non-sensitive) — logged via `after()` with placement + rank only; no IP/UA/cookie/search terms stored; salted daily visitor hash (cleared after 24h) used only for the >20 clicks/hour bot rule; crawler UAs, prefetch and HEAD not counted. Shown on `/admin/analytics` (clicks per day, by pharmacy, by page, and #1-rank share). `robots.ts` disallows `/go/`. Verified against a production build: real/bot/HEAD/invalid/junk-param/rate-limit cases all behave.
- [ ] Deferred, optional: affiliate attribution integration if an eligible programme is accepted — **partial (2026-09-26):** programme records, tracked-link templates with a per-click `clickRef`, activation gate (POM permission + terms) and admin UI are built and browser-verified with a test programme; still needs a real accepted programme and the network's own test-transaction check
- [ ] Deferred, optional: deduplication + reversal handling for commission events
- [x] Public correction-report form — `submitCorrectionRequest` (`src/actions/submissions/public-submissions.ts`) writes a `Correction` linked to the pharmacy
- [x] Correction review queue with named owner + audit trail — Corrections tab on `/admin/reviews`: taking a correction sets `assignedOwnerId`, and every change writes an `AuditLog` row
- [ ] Deferred, optional: commercial reporting dashboard (pending / approved / paid)
- [x] Verified: ranking is identical for partner vs. non-partner providers — `comparison.test.ts`: same order whichever providers are tagged as partners, plus a source guard that fails if ranking/public-offer code ever mentions affiliate/commission/referral data

## Open questions

- No affiliate-network selection is needed for launch. Revisit only if a future agreement supports the independent comparison service without influencing results.
- Who holds the "named escalation owner" role for credible safety/identity concerns (roadmap §2.11 service target)?
