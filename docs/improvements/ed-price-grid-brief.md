# Comparison table feedback for developer

18 Oct 2026 · Daud

The `/ed/compare` table needs to move from one long row-per-offer list to a Monj-style grid: one row per pharmacy, one column per strength, so a shopper sees every pharmacy's price for every dose at a glance. Then we beat Monj on accuracy, true total cost, per-price freshness, mobile and trust signals.

**Mock-ups (attached to the Trello card, placeholder pharmacies and prices):**

- `ed-price-grid-prototype.html` - clickable prototype of all three screens. Opens in any browser, works offline.
- `1-desktop-grid.png` - desktop and tablet grid
- `2-phone-variant-a-compact-table.png` - phone A/B variant A
- `3-phone-variant-b-swipe.png` - phone A/B variant B

## Monj vs our table today

Our engine is ahead of Monj on the hard part (true delivered total, per-price freshness, independent ranking); Monj is ahead on the layout shoppers actually scan. Reviewed against `offer-table.tsx`, `offer-results.tsx`, `comparison-filters.tsx` and `comparison.ts`.

| Feature | Monj (Mounjaro list) | Ours today (`/ed/compare`) | Action |
| --- | --- | --- | --- |
| Table shape | 1 row per pharmacy, 6 dose columns | 1 row per offer (pharmacy x product x strength x pack), 9 columns | Rebuild as grid (Change 1) |
| Price shown | Pen price only, no delivery or fees | Delivered total incl. delivery, consultation, other fees | Keep - our biggest edge |
| Price modes | Tabs: Discounted / Retail / Maintenance | One mode; discounts shown beside price, not applied | Add Standard / With code toggle |
| Dose selection | Dose chips: All, 2.5mg ... 15mg | Strength dropdown | Strength becomes the columns |
| Sorting | Not visible; stated as lowest total then A-Z | Dropdown: per tablet or total | Click-to-sort column headers |
| Cheapest highlighted | No highlight in table | "Lowest price" badge on row 1 only | Highlight cheapest cell per column |
| Search | Pharmacy name search box | None | Add |
| Filters | ~40 options (support, BMI, history, delivery, prescriber, reviews, payment) | Product, strength, form, pack, plan, sort | Add ED-relevant filters (see Filters) |
| Trust columns | Trustpilot, GPhC no. (linked), A/S, SUB | Logo, availability badge | Add GPhC, Trustpilot, flags |
| Freshness | Page-level dates that contradict each other | Per-offer "checked x hours ago" | Keep, show per cell |
| Summary block | Price range by dose: lowest / average / highest / count | 4 stat tiles | Add range-by-strength block |
| Rows shown | All ~79 on one page | Paginated | Show all (or top 25 + "Show all") |
| Mobile | "Swipe horizontally" | Horizontal scroll, `min-w-4xl` | Keep the table on phones; A/B test two layouts |
| Legend | Table key for abbreviations | None | Add |

Monj's own page has visible errors we must not repeat: its summary says the cheapest 2.5mg is £99 at Medicine Marketplace while the table shows £89; it cites both 77 and 79 pharmacies; and the table header says "verified 5 Sep 2026" while the footer says 15 October 2026. Several different pharmacies also share the same GPhC number with no explanation.

## Change 1: rebuild as a pharmacy x strength price grid

One row per pharmacy, one column per strength, for one product and one pack size at a time. This is the single biggest change and should become the default view on `/ed/compare` and the product price pages. See `1-desktop-grid.png` and the prototype.

How it works, ED-specific:

1. **Product tabs above the grid:** Generic sildenafil, Viagra, Viagra Connect, Generic tadalafil, Cialis, Cialis Together. Never mix brand and generic in one grid.
2. **Columns = strengths** of that product (sildenafil 25 / 50 / 100mg; tadalafil 2.5 / 5 / 10 / 20mg). For single-strength products (Viagra Connect 50mg, Cialis Together 10mg) the columns become pack sizes instead.
3. **Pack size chips** above the grid (4 / 8 / 12 / 16 / 24 ...). This is the problem Monj doesn't have: one Mounjaro pen is one month, but ED pack sizes vary by pharmacy. Default to the pack size listed by the most pharmacies, computed from the data, not hard-coded.
4. **Price mode toggle:** "Pack total" (default) or "Per tablet". In Per tablet mode add an "Any pack" option where each cell shows that pharmacy's lowest per-tablet price for that strength, with the pack size underneath ("8 tabs").
5. **Cell content:** delivered total (big), per-tablet price (small), freshness dot. Out of stock = greyed "Out of stock". Fees not yet verified = price with an asterisk and "Indicative" in the tooltip. Not sold in that pack = "-" with a tooltip, never a nearest-pack guess.
6. **Every price cell is a link** through `/go/[offerId]` to that exact product page on the pharmacy's site. Monj links to its own discount pages, so this is one click shorter for the shopper.
7. **Cheapest cell in each column is highlighted** (tinted background + "Lowest" label), not just row 1.
8. **Sort by clicking a strength header.** Default sort column = the strength with the most prices. Pharmacies with no price in the sorted column drop to the bottom. Keep the existing deterministic tie-break in `compareOffers` (verified fees first, then price, then id) and keep partner status out of the ordering.
9. **Keep the current detailed list** as a secondary "All prices" view - it is still the best way to compare across pack sizes.

Implementation suggestion: a pure `buildPriceGrid(offers, { product, packQuantity | "any", mode })` in `src/lib/comparison.ts` returning rows of `{ provider, cells: Record<strengthMg, PublicOffer | null> }`, unit-tested like the rest of that file, and a new `src/components/ed/price-grid.tsx`. State stays in URL params like today (for example `?medicine=sildenafil&type=generic&pack=8&sort=50`).

## Where we beat Monj

Matching Monj's layout gets us to parity; these are what make ours the better table. P1 ships with the grid, P2 straight after, P3 is later.

| Priority | Improvement | Why it beats Monj |
| --- | --- | --- |
| P1 | Every summary figure (stat tiles, range block, "cheapest" text) computed from the exact rows in the grid, with a unit test asserting summary minimum = grid minimum | Monj's summary contradicts its own table |
| P1 | Delivered total by default, with a "Medicine only" toggle | Monj shows pen price only; delivery and fees are hidden |
| P1 | One page-level "Prices last checked" = latest `checkedAt` in view, plus per-cell freshness | Monj shows conflicting dates |
| P1 | Cheapest cell highlighted per column; click-to-sort headers with `aria-sort` | Monj has neither |
| P1 | "Price range by strength" block above the grid: lowest, median, highest, number of pharmacies. Use median, not average, so one outlier doesn't skew it | Monj's range table disagrees with its own rows |
| P2 | Price movement in each cell: up / down arrow vs the previous recorded price (from `PriceHistory`), and a "30-day low" tag | Monj has no change indicators; gives people a reason to come back monthly |
| P2 | "With code" price mode: price after an approved, unexpired discount, labelled with who qualifies (e.g. new customers). Ranking stays on standard price by default | Monj's "retail" page still quotes discount-link totals as the cheapest |
| P2 | "Dispensed by X" line when `dispensingPartnerName` is set | Explains shared GPhC numbers instead of leaving them unexplained like Monj |
| P2 | Pharmacy name search box and a table key for every abbreviation and icon | Parity, done properly |
| P3 | Price alerts: "email me when 50mg x 8 drops below £X" | Retention; fits milestone 09 |
| P3 | "Copy link to this view" button (filters are already in the URL) | Easy sharing for Reddit / Facebook channels |
| P3 | Price history sparkline on each pharmacy profile | Monj has no history |

## Filters adapted for ED

Monj's filter panel has about 40 options, many weight-loss specific (BMI, gallbladder, diabetes medicines). Ours should be shorter and ED-relevant. Put them in a "Filters" drawer like Monj, with "Apply" and "Reset", and keep product, pack size and price mode as always-visible controls above the grid.

| Filter | Data | Status |
| --- | --- | --- |
| In stock only | `availability` | Existing data |
| Subscription / one-off | `purchaseModel` | Existing data |
| Free delivery | `deliveryFeePence` = 0 and fees verified | Existing data |
| No consultation fee | `consultationFeePence` = 0 | Existing data |
| Verified fees only (hide indicative) | `feeVerifiedAt` | Existing data, but nothing sets it yet - see Data changes |
| Has a discount | approved `Discount` rows | Existing data |
| Delivers to my area (England, Wales, Scotland, NI, Highlands & Islands, Channel Islands, Isle of Man) | `serviceRegions` | Field exists, needs populating |
| Next-day delivery available | new | New field |
| Minimum Trustpilot score (3+, 4+, 4.5+) | new | New field (licensing check first) |
| GPhC inspection outcome | new | New field |
| Payment methods (Apple Pay, Google Pay, PayPal) | new | New field |
| Discreet packaging stated | new | New field |

**Do not add** filters that could be read as a way round clinical screening, such as "accepts heart conditions", "accepts nitrates" or "no ID check". Monj's medical-history filters are the closest thing to this on its page and we should not copy them for ED.

## Mobile and accessibility

Most of this traffic will come from Reddit and Facebook on phones, so mobile is where we should clearly beat Monj's "swipe horizontally" table.

- **Tablet and desktop:** sticky header row and sticky first (pharmacy) column while scrolling. The shared `Table` already supports `stickyHeader`; `OfferTable` currently turns it off.
- **Phone (under 640px):** keep the table, in one of two layouts run as an A/B test (next section). The card-only phone view from the first mock-up is not being built.
- **Semantics:** real `<th scope="col">` / `<th scope="row">`, a `<caption>` stating product, pack and price mode, `aria-sort` on the sorted header, and price cells whose link text reads in full ("Pharmacy A, sildenafil 50mg x 8, £11.90, opens pharmacy site").
- **Highlighting not by colour alone:** the "Lowest" label and arrows need text or icons, not just a green tint.
- **Server-rendered:** the grid should render fully on the server so it is fast and crawlable once the POM indexing gate is lifted. Run the existing `npm run test:a11y` against the new page.

## Phone layout A/B test

Phones (under 640px) get one of two table layouts at random, and the one that sends more visitors through to a pharmacy becomes the default. Desktop and tablet keep the grid unchanged. See `2-phone-variant-a-compact-table.png`, `3-phone-variant-b-swipe.png` and the prototype.

| | Variant A: compact table | Variant B: swipe columns |
| --- | --- | --- |
| Layout | Every strength on screen at once; each cell shows the price and one label (Lowest or a price change) | Pharmacy column pinned; about two strength columns visible; swipe sideways and columns snap into place |
| Detail | Tap a pharmacy row to expand: every strength with pack total, per tablet and a View button, plus GPhC, delivery flags and code. Top row starts expanded | Price, per tablet and labels in each cell; tap a price to go straight to the pharmacy |
| Sorting | Tap a strength header; sorted column is shaded | Tap a strength header |
| Strength | Overview across all strengths | More detail per cell |

How to run it:

1. **Assignment:** 50/50, random, and sticky per visitor so a returning visitor sees the same layout. Only phone-width visits enter the test.
2. **Consent:** storing the variant (cookie or local storage) is generally treated as needing consent under the ICO's cookie guidance. Assign only after analytics consent; visitors without consent see variant A and are left out of the results. Confirm with whoever signs off the privacy page.
3. **Tracking:** add `layoutVariant` to `ReferralClick`, and record a page view per phone visit with its variant. Click-through can't be worked out without the page views, and today only clicks are logged.
4. **Primary metric:** share of phone visitors to a compare or product price page who click at least one View / price link. Secondary: clicks per visitor, time to first click, sort and expand use, bounce rate.
5. **Sample size and duration:** as an example, if 10% of phone visitors click through today, detecting a rise to 12% needs about 3,850 phone visitors per variant (95% confidence, 80% power). Run for at least two full weeks whatever the traffic, and don't stop early because one variant looks ahead.
6. **Decide before launch:** the primary metric and the smallest lift worth switching for. Write both on the Trello card so the result can't be reinterpreted afterwards.
7. **Tooling:** a feature-flag experiment tool (e.g. PostHog experiments) handles assignment and the statistics; otherwise a simple server-side flag plus the existing click table is enough.

## Data and schema changes

The grid itself needs no schema change: `ProductVariant` already separates strength and pack. The trust columns and P2 features do.

1. **Fix `feeVerifiedAt` first.** Per `docs/current-tasks.md` nothing ever sets it, so every public total shows "Indicative" and the "verified first" ranking rule does nothing. In the grid that would put an asterisk on every cell. Decide how fees get marked verified (e.g. approving a delivery policy sets it) before launch.
2. **Provider fields:** `trustpilotScore`, `trustpilotReviewCount`, `trustpilotUrl`, `trustpilotCheckedAt`; `inspectionOutcome`, `inspectionDate`; `nextDayDelivery`; `paymentMethods String[]`; `discreetPackaging`. Each with a checked-at date so stale facts can be flagged like prices.
3. **GPhC link:** build the public register link from the existing `regulatorReference`; no new field.
4. **`serviceRegions`:** already on `Provider`; needs populating for the "Delivers to my area" filter.
5. **Price movement:** query the latest two `PriceHistory` rows per offer (change arrow) and the 30-day minimum ("30-day low"). Precompute in `getPublicOffers` rather than per cell.
6. **Discounted price:** add a derived `discountedTotalPence` to `PublicOffer` for the "With code" mode, only for approved, unexpired discounts with a fixed or percentage value.
7. **A/B test:** `layoutVariant` on `ReferralClick` plus a page-view record per phone visit (see Phone layout A/B test).

## Build checklist

Done means every box below is ticked on the deployed page, not just in tests.

- [ ] Grid view is the default on `/ed/compare` and on each product price page; detailed list still available as "All prices"
- [ ] Product tabs, pack size chips and Pack total / Per tablet toggle all work and are reflected in the URL
- [ ] Single-strength products (Viagra Connect, Cialis Together) show pack sizes as columns
- [ ] Cheapest cell in every column is highlighted with a text label
- [ ] Clicking a strength header sorts by it; partner status never changes order (test exists)
- [ ] Every price cell links via `/go/[offerId]` and the click is recorded with the right placement
- [ ] Unit test: range block and stat tiles always equal the min / median / max of the rows in the grid
- [ ] One page-level "last checked" date, equal to the latest `checkedAt` shown
- [ ] Out of stock, not sold in this pack, and indicative prices each render distinctly and are explained in the table key
- [ ] GPhC number links to the register; Trustpilot shown only if the licensing check passes
- [ ] Phone: both A/B layouts built behind a flag, with the variant recorded on every page view and outbound click; tablet and desktop: sticky header and first column
- [ ] `npm run test:a11y`, `npm test`, tsc and eslint pass
- [ ] Tested with the full live dataset (85 published pharmacies), not the seed data

## Decisions for Daud

The developer can start on the grid now; these need an answer before it goes live.

| Decision | Recommendation |
| --- | --- |
| Default pack size and price mode | Pack listed by the most pharmacies; Pack total mode |
| Can "With code" ever be the default ranking? | No. Standard price ranks; code price is a toggle, labelled with who qualifies |
| Show Trustpilot scores? | Only after checking Trustpilot's terms for showing third-party scores; scraping may not be permitted. Fall back to a link to each pharmacy's Trustpilot page |
| How fees become "verified" (`feeVerifiedAt`) | Approving a pharmacy's delivery policy sets it for that pharmacy's offers |
| Show all pharmacies or paginate? | Show all on desktop like Monj; on phone show 20 with "Show more" |
| Lift the POM indexing gate | Prescription-only price pages are currently `noindex` until a solicitor reviews third-party POM price display (`src/lib/seo.ts`). Monj's list is indexed and ranks. Our content-led SEO plan depends on this review, so it should be booked now rather than at launch |

## Sources

- [Monj - Mounjaro price list (non-discounted)](https://monj.co.uk/mounjaro-price-list-non-discounted-uk/), reviewed 17 Oct 2026
- Codebase `pharma-comparison-engine-main`: `src/app/(site)/ed/compare/page.tsx`, `src/components/ed/offer-table.tsx`, `offer-results.tsx`, `comparison-filters.tsx`, `src/lib/comparison.ts`, `src/lib/seo.ts`, `prisma/schema.prisma`, `docs/current-tasks.md`
