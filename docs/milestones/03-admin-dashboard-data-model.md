# M3a — Admin Dashboard: Layout, Routes, Auth & Data Model

**Status:** ⬜ Not started
**Depends on:** M1, M2
**Roadmap:** [monj-functionality-and-ed-milestones.md § Milestone 3](../monj-functionality-and-ed-milestones.md#milestone-3--provider-directory-catalogue-and-staff-editing) (staff-editing portion) + [§4 data records](../monj-functionality-and-ed-milestones.md#4-proposed-system-and-operating-model)

## What we're building

The internal tool catalogue editors, content reviewers, administrators and the commercial manager use — and the database schema everything else (pharmacy listing, price engine, referrals) is built on top of.

- Prisma schema: `Provider`, `ProductVariant`, `Offer`, `Discount`, `Evidence`, `PriceHistory`, `Article`, `Correction`, `Referral`, `StaffUser`/`Role` — currently `prisma/schema.prisma` has **zero models**.
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

- [ ] Auth approach decided
- [ ] Prisma schema: `Provider`
- [ ] Prisma schema: `ProductVariant`
- [ ] Prisma schema: `Offer`
- [ ] Prisma schema: `Discount`
- [ ] Prisma schema: `Evidence`
- [ ] Prisma schema: `PriceHistory`
- [ ] Prisma schema: `Article`
- [ ] Prisma schema: `Correction`
- [ ] Prisma schema: `Referral`
- [ ] Prisma schema: `StaffUser` / `Role`
- [ ] First migration applied to a real Postgres instance
- [ ] `prisma/seed.ts` seeding realistic fake data
- [ ] Admin route group + layout + role guard
- [ ] Provider CRUD screens
- [ ] ProductVariant / Offer CRUD screens
- [ ] Audit / correction review-queue screen
- [ ] Staff role-management screen

## Open questions

- Auth provider decision (above) — blocks finalising the `StaffUser` model shape.
- Do we need a generic audit-log table (who changed what, when) beyond what `PriceHistory` already covers for prices specifically?
