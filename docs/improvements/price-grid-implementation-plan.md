# Price grid: implementation plan

Developer plan for the client brief in [`ed-price-grid-brief.md`](ed-price-grid-brief.md) (Daud, 18 Oct 2026),
the prototype `ed-price-grid-prototype (1).html` and the mock-ups `1-desktop-grid.png`,
`2-phone-variant-a-compact-table.png` and `3-phone-variant-b-swipe.png`.

## What exists today (checked against the code, 19 Oct 2026)

- `/ed/compare` (`src/app/(site)/ed/compare/page.tsx`): server page, `getPublicOffers()` once,
  `filterOffers` on URL params, 4 `StatTile`s, then `OfferResults` → `OfferTable` (one row per
  offer, paginated, `stickyHeader={false}`, `min-w-4xl`).
- Product price pages (`/ed/prices/[product]`, `ProductPricesView` in
  `src/components/ed/ingredient-prices-view.tsx`): variant cards plus the top 5 offers. The six
  products in `src/lib/ed-products.ts` are exactly the brief's six tabs.
- `src/lib/comparison.ts` (197 lines, tested in `comparison.test.ts`): `compareOffers` (verified fees
  first → price → providerId → id), `isRankable` (not out of stock), `filterOffers`,
  `parseComparisonFilters` / `comparisonHref` (`medicine`, `type`, `strength`, `form`, `pack`,
  `plan`, `sort`).
- `PublicOffer` (`src/types/comparison.ts`) has totals, `feesVerified`, `checkedAt`/`freshness`,
  `availability`, `purchaseModel`, `discounts`. It does **not** carry `regulatorReference`,
  `dispensingPartnerName` or any price-history data yet.
- Clicks go through `OutboundLink` → `/go/[offerId]` with a `ReferralPlacement`
  (`COMPARE`, `INGREDIENT_PRICES`, `PHARMACY_PROFILE`, `REPEAT_COSTS`).
- `feeVerifiedAt` is never set (open decision in `docs/current-tasks.md`), so every total is
  "Indicative". Approving a delivery policy lives in `src/actions/price-collection/site-offers.ts`.
- No cookie-consent mechanism exists anywhere in the app.
- **Conflict to sequence around:** the 2026-10-13 in-progress task adds columns to
  `ReferralClick` with a migration that is **not applied yet**. Any `layoutVariant` column must go
  in after it (or be folded into it), never as a competing migration.

## Phase 0 — pre-work (blocks a clean launch, not the build) — done 2026-10-19

1. **Set `feeVerifiedAt`** (brief "Data changes" #1, recommended decision): in the approve branch of
   the delivery-policy decision action, inside the existing `$transaction`, set
   `feeVerifiedAt = now()` on that pharmacy's offers whose delivery fee it just set. Unit test that
   approve sets it and dismiss doesn't. Without this every grid cell gets an asterisk.
2. Claim the task in `docs/current-tasks.md`.

## Phase 1 — the grid (P1, ships together) — done 2026-10-19, except phone "Show more"

### 1a. Pure grid logic — new `src/lib/price-grid.ts` (+ `price-grid.test.ts`)

Kept out of `comparison.ts` so neither file nears the 600-line limit; reuses its helpers.

- `buildPriceGrid(offers, { product, pack: number | "any", mode: "total" | "tablet", fees: boolean, sortColumn })`
  → `{ columns, rows: { provider, cells: Record<columnKey, GridCell> }[], defaultPack, packs }`.
  - Offers narrowed with `productOffers(offers, product)` (never mixes brand and generic).
  - **Columns** = distinct strengths of the product; if the product has one strength
    (Viagra Connect, Cialis Together) columns = pack sizes and pack chips are hidden.
  - **Default pack** = pack size listed by the most pharmacies (distinct providers), tie → smaller.
  - **Cell** = `{ kind: "price", offer } | { kind: "out-of-stock", offer } | { kind: "not-sold" }`.
    When one pharmacy has several offers for a cell (other formulation, subscription vs one-off),
    pick the best by `compareOffers`. Never fill a gap with a nearest-pack guess.
  - **"Any pack"** (per-tablet mode only): cell = that pharmacy's lowest per-tablet offer for the
    strength, keeping its pack size for the "8 tabs" sub-line.
  - **"Medicine only"** (`fees: false`) values come from `itemPricePence`; default is delivered total.
- **Row order:** by the sorted column's value using `compareOffers`' tie-break; rows with no
  rankable price in that column go to the bottom (then by name). Default sort column = the column
  with the most prices. Partner status is never an input (test that it can't change order).
- **Lowest per column:** cheapest rankable cell per column (ties all marked).
- `summarizeGrid(grid)` → per column `{ lowest, median, highest, pharmacyCount }` plus
  `latestCheckedAt`, computed **only from the grid's own cells**. Median, not mean.
- Tests: summary min equals grid min for every column (the brief's key P1 test), out-of-stock
  excluded from lowest/summary, default pack, single-strength columns, "any" pack, partner
  invariance, deterministic tie-break.
- Shapes (`PriceGrid`, `GridCell`, `GridColumnSummary`, `GridMode`) go in `src/types/comparison.ts`.

### 1b. URL state

Extend `parseComparisonFilters` / `comparisonHref` rather than adding a second parser:
`view=list` (grid is default), `pack=8|any`, `mode=tablet`, `fees=medicine`, `col=50` (sort column),
`q=` (pharmacy search). Product tabs reuse the existing `medicine` + `type` params. Canonical stays
`/ed/compare`.

### 1c. Components (server-rendered unless noted)

- `src/components/ed/price-grid.tsx` — the desktop/tablet grid, `common/table.tsx` with
  `stickyHeader` on and a sticky first column (`sticky left-0` + background token). Real
  `<th scope="col">` / `<th scope="row">`, a `<caption>` (product · pack · mode),
  `aria-sort` on the sorted header, headers are `Link`s to the re-sorted URL.
- `src/components/ed/price-grid-cell.tsx` — big total, small per-tablet, freshness dot (reuse
  `FreshnessPill` compact), `*` + "Indicative" tooltip (`common/tooltip.tsx`), greyed
  "Out of stock · Not ranked", "–" with "Not sold in this pack" tooltip, "Lowest" badge
  (`common/badge.tsx`, text not colour alone). The whole cell is an `OutboundLink` with full link
  text ("Pharmacy A, sildenafil 50mg × 8, £11.90, opens pharmacy site").
- Pharmacy cell: avatar, name → profile, GPhC number linked to the register (built from
  `regulatorReference`; confirm the register's per-pharmacy URL format), freshness, flag chips.
- `src/components/ed/price-grid-controls.tsx` — product tabs (grouped Sildenafil / Tadalafil),
  Pack total / Per tablet segmented toggle, pack chips (+ "Any pack" in per-tablet mode),
  "Include delivery & fees" — all plain links, so no client JS.
- `src/components/ed/price-range-block.tsx` — one card per column (lowest / median / highest /
  "N pharmacies in stock"), fed by `summarizeGrid`.
- `src/components/ed/price-grid-key.tsx` — table key, "How prices are worked out", "Before you buy"
  (copy from the mock-up; must not suggest switching strength).
- Pharmacy search: a tiny `"use client"` form that pushes `q` via `@/hooks/useRouter`; filtering is
  done server-side in `buildPriceGrid`.
- Page header: one "Prices last checked <date, time>" = `summarizeGrid().latestCheckedAt`, plus
  "Ranked by price only. Partners never move up."
- Skeleton `PriceGridSkeleton` in `src/components/ed/skeletons.tsx` matching the grid layout.
- Show all rows on desktop; on phone show 20 with "Show more" (`rows=all` link).

### 1d. Wire into pages

- `/ed/compare`: grid is the default view; "All prices" tab (`view=list`) keeps today's
  `OfferResults` table + filters untouched. When no product is chosen, default to the product with
  the most prices. In grid view, replace the 4 stat tiles with the range block, and feed
  `LiveSummary` the grid's offers so every figure on the page comes from the same rows.
- `/ed/prices/[product]`: replace the top-5 list with the grid for that product (product tabs link
  to the sibling product pages instead of query params); keep the variant cards below it or drop
  them if they duplicate the range block (check with client).
- Outbound placement: **built** reusing `COMPARE` (compare page) and `INGREDIENT_PRICES` (product
  pages); rank = row position in the sorted column. Separate `COMPARE_GRID` / `PRODUCT_GRID` values
  (to tell grid from list clicks) need an enum migration — deferred until the pending 2026-10-13
  click-details migration is applied.

### 1e. Phase 1 verification

`npm test`, `tsc`, eslint, `npm run test:a11y` on `/ed/compare` and one product page, then a
check on the full live dataset (85 published pharmacies), at 375px, 768px and 1440px, light and dark.

## Phase 2 — beat Monj (P2, straight after) — done 2026-10-19

1. **Price movement:** in `getPublicOffers`, one extra query over `PriceHistory` for the offers in
   view (latest two `deliveredTotalPence` per offer + 30-day minimum, via a window-function
   `$queryRaw` or grouped read — not per cell). Add `previousTotalPence` and
   `thirtyDayLowPence` to `PublicOffer`; cell shows ↓/↑ with the pence difference (icon + text)
   and a "30-day low" tag.
2. **"With code" mode:** add derived `discountedTotalPence` to `PublicOffer`, only from approved,
   unexpired fixed/percentage discounts (reuse `src/lib/discounts.ts`). Toggle
   "Apply first-order codes" (`codes=1`); label who qualifies; ranking stays on standard price
   unless the toggle is on, and the default never changes (per brief recommendation).
   "Current offer" column shows headline + code like the mock-up.
3. **"Dispensed by X"** chip: add `dispensingPartnerName` (and `regulatorReference`) to
   `PublicOffer`'s provider fields.
4. **Filters drawer** (`common/sheet.tsx`, client leaf with Apply / Reset writing URL params):
   in stock only, subscription / one-off, free delivery (fee 0 **and** verified), no consultation
   fee, verified fees only, has a discount. Quick chips above the grid for the top three (as in
   the mock-up). Region / next-day / Trustpilot / inspection / payment / discreet filters wait for
   the data in Phase 3. No clinical-screening filters, ever.

## Phase 3 — new provider data and A/B test — all done 2026-10-20 except the phone A/B assignment and tracking, which waits on a consent banner

1. **Schema** (one migration): on `Provider` — `trustpilotScore`, `trustpilotReviewCount`,
   `trustpilotUrl`, `trustpilotCheckedAt`, `inspectionOutcome`, `inspectionDate`,
   `nextDayDelivery`, `paymentMethods String[]`, `discreetPackaging`, each with a checked-at date.
   Admin pharmacy form fields to fill them (via `FORM`/`FormFeilds`); populate `serviceRegions`.
   Then switch on the matching filters and flag chips. Trustpilot score shown only after the
   licensing check; until then just a link to the pharmacy's Trustpilot page.
2. **Phone A/B layouts** (under 640px; desktop/tablet unaffected):
   - Variant A `price-grid-phone-compact.tsx`: all columns, price + one label per cell; rows
     expand via native `<details>` (no JS) to per-strength total, per tablet, View button, GPhC,
     flags, code; first row open.
   - Variant B `price-grid-phone-swipe.tsx` (per `3-phone-variant-b-swipe.png`): pinned pharmacy
     column (name, Trustpilot score with freshness dot, discount code inline e.g. "Code FIRST10");
     about two strength columns visible, CSS `scroll-snap` so columns snap into place; a
     "Swipe the table sideways for every strength" hint with a dot indicator (one dot per column
     page, the only part needing a small client leaf); each cell shows total, "£x/tab", the
     Lowest badge or price-change arrow, and "Not stocked" for gaps; sorted header shaded dark
     with an arrow; tapping a price goes straight to the pharmacy (no expand rows, unlike A).
   - Assignment: server-side, 50/50, sticky cookie — **only after analytics consent**. There is
     no consent banner in the app today, so this needs one first (and privacy-page sign-off).
     Until then everyone gets variant A and nothing is recorded.
   - Tracking: `layoutVariant` on `ReferralClick` plus a new lightweight page-view record per
     phone visit (variant, page, day); admin analytics gets a click-through-by-variant view.
     Primary metric and minimum lift written on the Trello card before launch; ≥ 2 weeks,
     ~3,850 phone visitors per variant.
3. **Later (P3):** "Copy link to this view" and the price-history sparklines on profiles are done (2026-10-20). Price alerts are done too (2026-10-20, Nodemailer).

## Decisions needed from the client before go-live

| Decision | Our default unless told otherwise |
| --- | --- |
| Fees become verified when a delivery policy is approved | Yes (Phase 0) |
| Default pack / mode | Most-listed pack, Pack total |
| "With code" as default ranking | Never |
| Trustpilot scores | Link only until licensing is checked |
| Show all vs paginate | All on desktop; 20 + "Show more" on phone |
| Consent banner for the A/B test | Needed — who signs off the privacy wording? |
| Product pages: keep the variant cards under the grid? | Drop if the range block covers them |
| POM indexing gate (`pomPricingRobots`) | Unchanged; solicitor review should be booked now |

## Done means

The brief's build checklist, plus: a `docs/new-updates-summary.md` entry in plain language and the
task closed in `docs/current-tasks.md`.
