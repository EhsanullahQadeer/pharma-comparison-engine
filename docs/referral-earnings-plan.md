# Referral Earnings — Implementation Plan

**Status:** Phases 1–2 done (2026-09-26). Phase 3 (commission import) needs a real network report sample; nothing goes live until a real programme passes §2.
**Supersedes:** the "deferred, optional" affiliate items in [M7](milestones/07-referrals-reporting.md)
**Roadmap refs:** [§2.10 How referrals become money](monj-functionality-and-ed-milestones.md), §4.7 failure scenarios

## 0. What "referral" means here

A visitor compares prices on `/ed/compare` (or a pharmacy/ingredient page) and
clicks through to a pharmacy. If that pharmacy runs an affiliate programme we
have been **accepted** into, the click carries an attribution reference. When
the pharmacy reports an eligible sale, we earn commission:

```
click → /go/<offerId> (logged) → tracked pharmacy URL → pharmacy's own consultation + checkout
      → network/pharmacy reports transaction → PENDING → APPROVED | DECLINED | REVERSED → PAID
```

Money is only counted as income when it is **APPROVED**, and only as cash when
**PAID**. Clicks are a traffic metric, never revenue.

## 1. Non-negotiable rules

These carry over from the confirmed scope (2026-09-16). The system is designed
so they can't be broken by accident.

1. **Ranking independence.** `src/lib/comparison.ts` (`compareOffers`,
   `splitRankedOffers`, `isRankable`) never reads any affiliate or commission
   field. `PublicOffer` doesn't carry affiliate data at all; the outbound URL is
   resolved server-side at click time. A regression test asserts that an
   identical offer set ranks identically when affiliate status is flipped.
2. **Same presentation, except the link.** *Changed 2026-09-26 (Monj-style
   links):* only partner pharmacies get a "View" link or website link; every
   other pharmacy is still listed, priced and ranked in full, shown as
   "Listed for comparison". Partner links carry "Partner · we may earn
   commission", and the independence and partners pages list every partner
   from the same data. Otherwise there is no "featured", "recommended" or
   boosted placement, and styling is identical.
3. **No health data leaves the site.** The attribution reference (`clickRef`)
   is an opaque random ID. We never put the search, filters, ingredient,
   strength, page path or any free text into a partner URL (roadmap §2.10).
   We never ask partners for patient names, questionnaire answers or decline
   reasons.
4. **Only approved destinations.** `/go/*` redirects only to an offer's stored
   `sourceUrl` (or its programme's tracked version), and only when the offer is
   published and its provider is `PUBLISHED`. Arbitrary URLs are never
   accepted, so it can't be used as an open redirect.
5. **Staff-gated money.** Creating or approving programmes, importing
   commissions, changing statuses and recording payouts all require
   `requireStaffRole(["COMMERCIAL_MANAGER", "ADMINISTRATOR"])`, run inside
   `prisma.$transaction`, and write an `AuditLog` row.
6. **Honest disclosure.** The independence and partners pages list every live
   programme. Offer buttons that use a tracked link carry an "ad"/"commission"
   disclosure. The "No referral income today" copy is replaced only when the
   first programme goes live.

## 2. Hard blocker to resolve first (business, not code)

Many pharmacy affiliate programmes **ban promoting prescription-only
medicines.** Click Pharmacy's Awin terms are the documented example (roadmap
§2.10). Sildenafil 50/100mg and tadalafil are POMs, and ASA/CAP rules restrict
public POM advertising. Before any engineering beyond Phase 1:

- [ ] Client applies to the target programmes (Awin, CJ, Impact, or direct
      deals) and gets written confirmation that **price comparison of ED POMs
      is a permitted activity**.
- [ ] Legal/regulatory review of how a commission link on a POM price
      comparison sits with the MHRA/ASA advertising rules, and approval of the
      disclosure wording.
- [ ] For each accepted programme, record: commission basis (fixed/%),
      exclusions (fees, POMs, consultation), new vs returning customer,
      attribution window, clinical-decline and refund rules, repeat-order
      payment, settlement timing.

Phase 1 is worth building either way: click analytics is useful with zero
partners, and roadmap §4.7 requires a plain outbound link that records zero
revenue.

## 3. Data model

Replace the unused `Referral` scaffold and derive `Provider.affiliateApproved`
from programme status. Add a new domain type file, `src/types/referrals.ts`.

```prisma
enum AffiliateNetwork      { AWIN CJ IMPACT DIRECT OTHER }
enum AffiliateProgrammeStatus { APPLIED ACTIVE PAUSED REJECTED ENDED }
enum CommissionBasis       { FIXED PERCENT }
enum CommissionStatus      { PENDING APPROVED DECLINED REVERSED PAID }
enum CommissionSource      { NETWORK_API CSV_IMPORT POSTBACK MANUAL }

// One agreement per provider (history kept via status ENDED + a new row).
model AffiliateProgramme {
  id                 String   @id @default(cuid())
  providerId         String
  provider           Provider @relation(...)
  network            AffiliateNetwork
  networkMerchantId  String?            // e.g. Awin advertiser id
  status             AffiliateProgrammeStatus @default(APPLIED)
  linkTemplate       String             // e.g. "https://www.awin1.com/cread.php?awinmid={mid}&awinaffid={affid}&clickref={clickRef}&ued={url}"
  commissionBasis    CommissionBasis
  commissionValue    Int                // pence if FIXED, basis points if PERCENT
  attributionDays    Int?
  termsUrl           String?
  termsNotes         String?            // exclusions, POM permission evidence
  pomPromotionPermitted Boolean @default(false) // must be true before ACTIVE
  activatedAt        DateTime?
  endedAt            DateTime?
  createdAt / updatedAt
  clicks      ReferralClick[]
  commissions CommissionEvent[]
  @@index([providerId, status])
}

// One row per outbound click. No IP, no user agent string, no cookie id.
model ReferralClick {
  id            String   @id @default(cuid())
  clickRef      String   @unique       // opaque, sent to the network
  offerId       String?                // SetNull on offer delete
  providerId    String
  productVariantId String?
  programmeId   String?                // null = plain link, zero commission
  placement     ReferralPlacement      // COMPARE_TABLE | OFFER_CARD | PROVIDER_PAGE | INGREDIENT_PAGE
  rankPosition  Int?                   // position shown, for "did we send clicks to the cheapest?" reporting
  isLikelyBot   Boolean  @default(false)
  visitorHash   String?                // sha256(ip + ua + daily-rotating salt) — dedupe only, unlinkable after 24h
  createdAt     DateTime @default(now())
  @@index([providerId, createdAt])
  @@index([programmeId, createdAt])
}

// One row per network transaction; idempotent on (programmeId, networkTransactionId).
model CommissionEvent {
  id                   String   @id @default(cuid())
  programmeId          String
  networkTransactionId String
  clickRef             String?          // links back to ReferralClick when the network returns it
  clickId              String?
  status               CommissionStatus @default(PENDING)
  orderValuePence      Int?
  commissionPence      Int
  currency             String  @default("GBP")
  transactionAt        DateTime
  statusChangedAt      DateTime
  source               CommissionSource
  rawPayload           Json?            // network row, stripped of any personal fields
  payoutId             String?
  createdAt / updatedAt
  @@unique([programmeId, networkTransactionId])
  @@index([status])
}

// A settlement received from a network/pharmacy.
model CommissionPayout {
  id            String   @id @default(cuid())
  programmeId   String
  periodStart   DateTime
  periodEnd     DateTime
  amountPence   Int
  paidAt        DateTime
  reference     String?                  // remittance/invoice ref
  recordedById  String
  events        CommissionEvent[]
}
```

Retention: `ReferralClick` rows are aggregated into daily counts and deleted
after 13 months (or the longest attribution window plus 90 days). `visitorHash`
is nulled after 24h.

## 4. Phases

### Phase 1: tracked outbound links (no partners needed) — ✅ done 2026-09-26

As built: placements are `COMPARE`, `INGREDIENT_PRICES`, `PHARMACY_PROFILE` and `REPEAT_COSTS`; no separate `clickRef` column yet (the click id will serve as it in Phase 2); links use `rel="nofollow noopener"` (add `sponsored` only once a programme is live); invalid offers redirect to `/ed/compare` rather than 404.

- `src/app/go/[offerId]/route.ts`: a GET route handler that looks up the
  published offer and `PUBLISHED` provider (404 otherwise), writes a
  `ReferralClick`, and returns a `302` to the destination. This is a
  user-facing redirect, not internal data access, so it's added as a
  documented exception to Code Rule 2 alongside `api/auth` and `api/discovery`.
  - Placement and rank arrive as short query params (`?p=compare&r=3`),
    validated with zod against the enum. Unknown values are dropped, never
    forwarded.
  - Bot heuristic: known crawler user agents, `Purpose: prefetch` /
    `Sec-Purpose` headers, HEAD requests, or more than 20 hits per
    `visitorHash` per hour set `isLikelyBot`. Bots still redirect but aren't
    counted.
  - Headers: `Cache-Control: no-store`, `X-Robots-Tag: noindex`,
    `Referrer-Policy: origin` (partners see `ourdomain.co.uk`, never the
    filtered URL).
  - Write the click after the redirect with `after()` from `next/server`
    (check the Next 16 docs first) so the log write doesn't slow the redirect.
- `robots.ts`: `disallow: /go/`.
- `offer-table.tsx` and `offer-card.tsx`: point the button at a new helper,
  `outboundHref(offer, placement, rank)` in `src/lib/referrals.ts`, with
  `rel="nofollow sponsored noopener"`. Use a plain `<a>` (not `Link`) so it
  isn't prefetched.
- Admin: an **Outbound clicks** card on `/admin/analytics` showing clicks per
  day, per provider and per placement, plus the share of clicks that went to
  the #1-ranked offer (the independence health metric).
- Tests: add the ranking-independence regression to
  `src/lib/comparison.test.ts`, plus route tests for the 404, unpublished and
  bot cases.

### Phase 2: affiliate programmes — ✅ done 2026-09-26

As built: `AffiliateProgramme` is one row per pharmacy (`providerId` unique; history is in the audit log), with a `pomPromotionPermitted` flag and a `termsUrl` both required to activate. Activating also ticks the pharmacy's "Affiliate partner" flag in the same transaction; pausing or ending leaves that tick for staff to decide. Templates take `{url}` (encoded), a leading `{rawUrl}` (direct deals) and `{clickRef}` (= the `ReferralClick` id, generated before the redirect); validation lives in `src/lib/affiliate-links.ts`, shared by the form, the server and `/go`. The admin card shows a live example tracked link built from one of the pharmacy's real product pages. Public partner disclosure is `src/components/ed/partner-disclosure.tsx`.

- Migration: add `AffiliateProgramme`, drop `Referral`, and backfill nothing
  (no live programmes exist).
- `src/actions/referrals/programmes.ts`: CRUD plus `activateProgramme`, which
  refuses unless `pomPromotionPermitted`, `termsUrl` and a rendered test link
  exist. Keep the `Provider.affiliateApproved` flag in sync inside the same
  transaction, or remove it and derive it instead (preferred).
- Admin page `/admin/commercial/programmes`: table plus a form modal
  (`FORM`/`FormFeilds`), a status badge map in a new
  `src/lib/commercial-labels.ts`, and a "Test link" button that shows the
  final URL for a sample offer.
- `/go` resolves an ACTIVE programme for the provider and builds the URL from
  `linkTemplate`. Only `{clickRef}`, `{url}` (the offer's `sourceUrl`,
  URL-encoded) and fixed programme ids may be substituted. The template is
  validated on save, so any other placeholder or a non-https URL is rejected.
- Public disclosure: add a small "Commission link" marker to the offer button
  when a programme is active. The marker is resolved from a
  `providerId → hasActiveProgramme` set passed separately from `PublicOffer`,
  so ranking code never sees it. Also auto-list active programmes on
  `/ed/independence` and `/ed/pharmacies/partners`.

### Phase 3: commission ingestion and reconciliation

- `src/lib/commissions/` holds one adapter per source, all returning a common
  `CommissionRow` shape (`src/types/referrals.ts`):
  - **CSV import** (build first): works with every network. The admin uploads
    a report, previews the parsed rows, then confirms.
  - **Awin Transactions API** (if Awin is used): a scheduled pull of the last
    N days, run like `price-collection:run-due` with a
    `commissions:sync` npm script.
  - **Postback webhook** (only for direct deals that require it):
    `src/app/api/commissions/postback/[programmeId]/route.ts` with an HMAC
    signature check and a replay window. This is an external integration
    point, like `api/discovery`.
- Upsert on `(programmeId, networkTransactionId)`. A status change writes
  `statusChangedAt` and an `AuditLog` entry. Legal status moves are
  `PENDING→APPROVED|DECLINED`, `APPROVED→REVERSED|PAID` and `PAID→REVERSED`
  (clawback). Illegal moves are rejected, and the transition map lives next
  to the labels, the same way `provider-status-transitions.ts` does it.
  Replaying the same file or API window never double-counts.
- Admin page `/admin/commercial/commissions`: paginated
  (`PaginationServer`) and filterable by status, programme and month, with
  bulk "mark paid" that records a `CommissionPayout` and links its events.
  Unmatched `clickRef`s are flagged, not dropped.

### Phase 4: earnings reporting

- `/admin/commercial` overview (COMMERCIAL_MANAGER and ADMINISTRATOR):
  - Pending, approved, paid and reversed totals for this month, last month and
    year to date.
  - Per programme: clicks, attributed sales, conversion %, approval rate,
    average commission, and **earnings per 1,000 visits**, with the roadmap's
    £0.048/visit sanity line.
  - Payout ageing: approved but unpaid for more than the programme's
    settlement terms.
  - Independence check: click share to the #1-ranked offer, split by partner
    and non-partner. A drop for non-partners is a warning sign to investigate.
- Monthly CSV export for the accountant.
- Built with the existing analytics components and the dataviz conventions,
  with skeleton loaders per UI Rule 2.

## 5. Privacy and cookies

- Our side sets **no cookies** for referrals: the click log is server-side and
  the ID is opaque.
- The partner/network sets its own tracking cookie on its domain after the
  redirect. Get legal advice on whether PECR requires a consent step or
  notice on our side, and add it to the privacy page (currently a preview) in
  any case.
- Add a DPIA note: pseudonymous click events plus network transaction IDs may
  still count as personal data, so document the minimum fields, retention and
  whether each network is an independent controller.

## 6. Out of scope

- Paid placement, sponsored slots, or commission-weighted ranking. These are
  prohibited, not deferred.
- User accounts, refer-a-friend, or customer cashback. These are a separate
  product decision.
- Forecasting revenue from assumed partners (roadmap §4.7).
- Recording repeat-order commission unless a contract explicitly pays it.

## 7. Open questions for the client

1. Is referral income now a **launch requirement**? The 2026-09-16 scope says
   no partners at launch, so this plan reverses that, and M0/M7 and the
   public independence copy need updating to match.
2. Which pharmacies and networks do you intend to apply to? Has any programme
   confirmed that ED POM comparison is permitted?
3. Who is the named commercial owner (the `COMMERCIAL_MANAGER` user) who
   reconciles and records payouts?
4. Disclosure wording and position: the legal review should approve the exact
   words ("Ad", "Commission link" or a footnote).
5. Cookie/consent approach for network tracking.

## 8. Build order and estimate

| Phase | Depends on | Rough effort |
| --- | --- | --- |
| 1 Tracked outbound links + click analytics | nothing | 2–3 days |
| 2 Programmes + tracked URLs + disclosure | §2 blocker cleared for ≥1 programme | 3–4 days |
| 3 CSV import, then API/postback, reconciliation | Phase 2, a real network report sample | 4–6 days |
| 4 Earnings dashboard + export | Phase 3 | 2–3 days |

Definition of done (from roadmap M7): only approved destinations are used;
flipping affiliate status cannot change rank (test); the network's test method
confirms attribution works; duplicate, refund and missing-tracking events are
handled; pending → approved → paid reconciles against one real network
statement.
