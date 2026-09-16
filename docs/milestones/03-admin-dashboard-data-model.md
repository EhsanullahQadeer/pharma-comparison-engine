# M3a — Admin Dashboard: Layout, Routes, Auth & Data Model

**Status:** ✅ Done — both items the 2026-09-16 platform pivot reopened are built, migrated and browser-verified.
**Depends on:** M1, M2
**Roadmap:** [monj-functionality-and-ed-milestones.md § Milestone 3](../monj-functionality-and-ed-milestones.md#milestone-3--provider-directory-catalogue-and-staff-editing) (staff-editing portion) + [§4 data records](../monj-functionality-and-ed-milestones.md#4-proposed-system-and-operating-model)
**Platform context:** [`00-platform-strategy.md`](00-platform-strategy.md)

**2026-09-16, later same day — reopened items closed:** Both schema gaps below are done:

1. **Category-awareness** — added `ProductCategory` enum (`ERECTILE_DYSFUNCTION`, `WEIGHT_LOSS`) and `ProductVariant.category` (indexed), extended `Ingredient` with `TIRZEPATIDE`/`SEMAGLUTIDE`. Migration (`prisma/migrations/20260916072440_pivot_product_category_and_offer_history`) backfills the 8 pre-existing ED variants to `ERECTILE_DYSFUNCTION` via a temporary column default that's then dropped, so new rows must specify a category explicitly rather than silently inheriting one. `Provider` stays category-agnostic as planned. The product-variant form/action/table (`src/components/admin/product-variant-form-modal.tsx`, `src/actions/product-variants/product-variants.ts`, the catalogue page) all gained a category selector/column; `src/lib/catalogue-labels.ts` got `productCategoryLabels`/`productCategoryValues`. Seeded 3 real weight-loss demo variants (Mounjaro 5mg/10mg, Wegovy 1mg) to prove the vertical out.
2. **Full offer/discount history** — broadened `PriceHistory` in place (kept the name — a rename would have rippled through every call site for no real benefit) to also snapshot `deliveryFeePence`, `consultationFeePence`, `otherMandatoryFeesPence`, `availability`, and `activeDiscountSnapshot` (a point-in-time JSON copy of whatever discount was active, not a live relation, since the `Discount` row itself can later change or be deleted). Centralized the write logic in a new `src/lib/price-history.ts`'s `recordPriceHistorySnapshot(tx, offerId, effectiveFrom)` — it reads the offer's current state itself rather than trusting a caller-supplied snapshot, so `offers.ts` and `discounts.ts` can't drift out of sync on what "current state" means. Wired into `createOffer`/`updateOffer` (now triggers on availability changes too, not just price/fee changes) and `createDiscount`/`deleteDiscount` (newly wrapped in `$transaction`, per Code Rule 13 — discount changes previously wrote no history at all).

No new admin screen was needed — a dedicated "pharmacy price/discount timeline" view reading these fields is a reasonable follow-up, not part of this item.

**Verification:** `tsc --noEmit`, `eslint`, and `next build` all clean. Migration applied to the live Postgres instance. Full Playwright walkthrough: logged in, confirmed the Category column and both verticals' labels/brands (Mounjaro, Wegovy) render on `/admin/catalogue/product-variants`, confirmed the Add-variant modal's category select works, added a real offer and a real discount on a live provider, and queried the database directly afterward to confirm two distinct `PriceHistory` rows were written — one plain offer snapshot, one carrying the discount's exact terms in `activeDiscountSnapshot` — proving the "why did the total change" timeline actually works end to end, not just that the migration applied. Server actions returned 200 with no thrown errors. Spotted one pre-existing, unrelated hydration warning on the product-variants page's search input (a `caret-color` style mismatch) during this pass — not caused by this change (it doesn't touch that input) and out of scope to fix here per Code Rule 8.

**2026-09-15 implementation update:** `prisma/schema.prisma` now has all ten models from the roadmap's §4 table, migrated to the project's Postgres instance (`prisma/migrations/20260915060613_init_provider_catalogue`). Auth decision made: Auth.js (`next-auth@beta`) with a Credentials provider against `StaffUser` (bcrypt-hashed passwords) and JWT sessions — no database adapter, since Credentials-provider users aren't persisted by Auth.js itself and this is a staff-only tool with no need for OAuth/MFA. `/admin/*` is gated both by `src/proxy.ts` (convenience redirect) and an authoritative session/role check in `src/app/admin/(dashboard)/layout.tsx` (Server Functions can bypass proxy matchers, so the layout check is the real gate). `prisma/seed.ts` creates the first administrator (from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env`) and 12 fake providers via `@faker-js/faker`. Built so far: staff login, a dashboard with provider status counts, a provider list table, and the manual pharmacy-entry form (`src/actions/providers/providers.ts`, Zod-validated, role-checked, new providers always start `DISCOVERED`). **Same-day addendum:** added an `AuditLog` model (not in the roadmap's §4 table — resolves this doc's "Open questions" item below) plus `src/lib/audit-log.ts`'s `recordAuditLog()` helper, wired into `createProvider` as the first call site (`prisma/migrations/20260915101315_add_audit_log`).

**2026-09-15, later same day — milestone completed:** Built every remaining checklist item. Provider detail page (`/admin/pharmacies/[id]`) with an edit modal, a status-transition control validated against an explicit `providerStatusTransitions` map (`src/lib/provider-status-transitions.ts` — `TEMPORARILY_WITHHELD` open to catalogue editors, `ARCHIVED` administrator-only in both directions), and an Offers section. Product-variant catalogue CRUD at `/admin/catalogue/product-variants` (first real use of `PaginationServer`/`parsePageSize`, which existed but had no consumer yet). Offer + Discount CRUD nested under the provider detail page — offer price edits write a `PriceHistory` row in the same transaction (Code Rule 13). An Evidence/Correction review queue at `/admin/reviews` (tab toggle, approve/reject evidence, self-assign/resolve corrections). Staff role management at `/admin/staff` (administrator-only; deactivate rather than delete, since `StaffUser` is referenced elsewhere). A read-only audit-log viewer at `/admin/audit-log` with entity-type/action filters. A Recharts analytics build (`npm install recharts`): a `getAdminAnalytics()` server action feeding 10 chart widgets (provider funnel, status donut, providers-added trend, regulator mix, offer availability, purchase model, evidence/correction status, audit activity, staff-by-role) — a curated 3-widget subset replaced the dashboard's old plain bar-list breakdown, and a full `/admin/analytics` page holds all 10. `prisma/seed.ts` extended with product variants, offers, discounts, evidence, corrections and additional staff so every new screen has real data to show.

Two real bugs found and fixed during verification (Playwright walkthrough, not just `tsc`/`eslint`/`next build`): (1) the long-running dev server's `PrismaClient` singleton predated the `AuditLog` migration and crashed every call touching it with a `Cannot read properties of undefined (reading 'findMany')` — a server restart fixed it; not a code defect, but a reminder that this project's dev-server-singleton pattern needs a restart after certain schema changes. (2) `common/modal.tsx` cloned an internal `close` function prop onto whatever element was passed as `children`, and when that element was a `DialogContent` (the pattern already used by the pre-existing `AddPharmacyModal`, and now several new modals), the prop leaked through to a raw `<div>`, producing a real React console warning on every modal open — fixed by only injecting `close` for the function-children form, since nothing in the codebase actually consumed the cloned prop. Also fixed: Recharts' `ResponsiveContainer` went permanently blank after a live (no-navigation) dark/light toggle on the analytics page, since its internal size cache never invalidates when no layout dimensions actually change — fixed by extracting the theme toggle's state into a shared `src/lib/theme-store.ts` and having `ChartCard` remount its chart subtree on theme change.

## What we're building

The internal tool catalogue editors, content reviewers, administrators and the commercial manager use — and the database schema everything else (pharmacy listing, price engine, referrals) is built on top of.

- Prisma schema: `Provider`, `ProductVariant`, `Offer`, `Discount`, `Evidence`, `PriceHistory`, `Article`, `Correction`, `Referral`, `StaffUser`/`Role`, `AuditLog` — currently `prisma/schema.prisma` has **zero models**.
- Auth + role-based access for the four staff roles the roadmap defines: catalogue editor, content reviewer, administrator, commercial manager.
- Admin layout: sidebar nav, data tables, forms, audit-log views.
- Seed script: representative fake providers/variants/offers so local dev and later milestones don't need real scraped data to build against.

## How we're building it

- **Schema** — Prisma 7 with the `@prisma/adapter-pg` driver adapter already wired ([`src/lib/prisma.ts`](../../src/lib/prisma.ts)). Model the roadmap's §4 "Minimum data records" table directly: `Provider`, `ProductVariant`, `Offer`, `Discount`, `Evidence`, `PriceHistory`, `Article`, `Correction`, `Referral` — each carrying the fields that table lists (trading/legal names, regulator references, ingredient/brand/strength/pack, delivered-total inputs, source URL + retrieved/checked dates, etc.). Money stored as **integer pence** per roadmap §4 "Fair price calculation" — never float.
- **Auth** — not yet decided; needs its own quick decision (see Alternatives) before the `StaffUser`/`Role` model shape can be finalised.
- **Admin UI** — a new `src/app/admin/*` route group with its own layout (`admin/layout.tsx`), guarded by a role check. Tables built with shadcn's table primitives, forms validated with Zod, mutations via Next.js Server Actions — no separate REST API needed inside the same app.
- **Seeder** — `prisma/seed.ts`, invoked via `prisma db seed`, generates N fake providers/variants/offers (e.g. with `@faker-js/faker`) so M3b (listing) and M4/M5 (price engine) can be built and tested before any real data exists.

## Alternatives considered

**Data model / staff tooling** (roadmap table):

| Approach | Trade-off |
| --- | --- |
| Custom — catalogue records, permissions, staff forms built in-app | Best validation and audit control; higher effort |
| Third party — structured CMS/database service as the editorial backend | Faster staff tooling; relational integrity (offer ↔ variant ↔ provider) and exports need review |
| **Hybrid (recommended by roadmap)** — own the product/offer database; import staff-managed spreadsheets or CMS content through validation | Easy initial operations; mapping must be maintained |

**Auth** (our own decision — not in the roadmap's tables):

| Approach | Trade-off |
| --- | --- |
| **Auth.js (NextAuth) + Prisma adapter — recommended** | Free, integrates directly with Next.js App Router + Prisma (already the ORM here), self-hosted, no new external dependency |
| Clerk / WorkOS (managed) | Fastest to ship, MFA/SSO out of the box, recurring cost for what's an internal-only tool |
| Roll-your-own session + password hashing | No dependency, most engineering effort, easy to get subtly wrong (timing attacks, session fixation) |

## Checklist

- [x] Auth approach decided — Auth.js Credentials provider + JWT sessions (no adapter/OAuth)
- [x] Prisma schema: `Provider`
- [x] Prisma schema: `ProductVariant`
- [x] Prisma schema: `Offer`
- [x] Prisma schema: `Discount`
- [x] Prisma schema: `Evidence`
- [x] Prisma schema: `PriceHistory`
- [x] Prisma schema: `Article`
- [x] Prisma schema: `Correction`
- [x] Prisma schema: `Referral`
- [x] Prisma schema: `StaffUser` / `Role`
- [x] Prisma schema: `AuditLog`
- [x] First migration applied to a real Postgres instance
- [x] `prisma/seed.ts` seeding realistic fake data
- [x] Admin route group + layout + role guard
- [x] Provider CRUD screens — create + list (`/admin/pharmacies`, `/admin/pharmacies/new`); detail/edit/status-transition/archive at `/admin/pharmacies/[id]`
- [x] ProductVariant / Offer / Discount CRUD screens
- [x] Audit-log viewer + Evidence/Correction review queue
- [x] Staff role-management screen
- [x] Recharts analytics build (dashboard summary + full `/admin/analytics` page)
- [x] `ProductCategory` enum + `ProductVariant.category` field; `Ingredient` extended with weight-loss values; existing data migrated to `ERECTILE_DYSFUNCTION` (reopened 2026-09-16, closed same day)
- [x] Offer/discount history extended beyond price (fees, availability, discount terms snapshotted on change) (reopened 2026-09-16, closed same day)

## Open questions

- ~~Do we need a generic audit-log table (who changed what, when) beyond what `PriceHistory` already covers for prices specifically?~~ **Resolved 2026-09-15: yes.** Added `AuditLog` (`actorId` → `StaffUser`, `action` enum `CREATE`/`UPDATE`/`DELETE`, string `entityType`/`entityId` pair since one log must cover every model, optional `changes` JSON). `src/lib/audit-log.ts`'s `recordAuditLog()` is the write helper — call it next to a mutation, not inside its `$transaction`, so a failed audit write can't roll back the real change. Wired into every CRUD action built for this milestone; viewable at `/admin/audit-log`.

None outstanding — this milestone is complete again as of 2026-09-16 (ED-only scope from 2026-09-15, plus the platform-pivot's category/history items closed the same day they were reopened). M3b (`04-pharmacy-listing.md`) picks up discovery adapters, the public submission form, and the pilot run — now also category-aware, see that file.
