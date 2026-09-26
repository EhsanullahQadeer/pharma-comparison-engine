# Partner Portal — Plan

**Status:** Step A done (2026-09-26); steps B–F not started. Builds on
[`referral-earnings-plan.md`](referral-earnings-plan.md) Phases 1–2
(`ReferralClick`, `AffiliateProgramme`, partner-only links).

## Goal

Each affiliated pharmacy gets its own login and a dashboard showing the traffic
we send it: how many visitors clicked through to its site, from which part of
our site, for which products, and at what ranking position. Later, once
commission import exists, it also shows the sales and commission those clicks
produced.

## Non-negotiable rules

1. **A pharmacy only ever sees its own data.** Every partner query is scoped
   to the `providerId` taken from the signed-in session, never from a URL or
   form value. One `requirePartner()` helper returns that id, and every
   partner action starts with it.
2. **Partners can never reach staff pages or actions.** Today
   `src/app/admin/(dashboard)/layout.tsx` only checks that *someone* is
   signed in, and the proxy does the same. So a partner session on the
   current login would get into the admin dashboard. The session must carry
   an account type, and the admin layout, proxy and `requireStaffRole` must
   all reject non-staff. **This hardening ships first, before any partner
   account exists.**
3. **No visitor data, because we have none to give.** Clicks store no IP,
   browser, cookie or search terms (M7). The portal shows counts only. The
   24-hour visitor hash is never shown or exported.
4. **Nothing about competitors.** No other pharmacy's clicks, no "share of all
   clicks", and no "you lost N clicks to X". Their own ranking position is
   fine to show, because it's already public and based purely on price.
5. **No pay-to-rank pressure.** The dashboard never suggests paying for a
   better position. The only lever it points to is the real one: a lower
   genuine price or verified fees (ranking rules, M5).

## What the dashboard shows

The dashboard offers 7-day, 30-day, 90-day and 12-month ranges. Likely bots
are excluded from every figure.

| Panel | Source | Notes |
| --- | --- | --- |
| Clicks to your site, per day | `ReferralClick` (own `providerId`, `isLikelyBot=false`) | The headline number, with change vs the previous period |
| Estimated unique visitors per day | Nightly rollup of distinct `visitorHash` per day, computed **before** the hash is cleared | Approximate: shown as "about N people", never per person |
| By section of our site | `placement`: Compare, Medicine prices, Your profile page, Repeat costs | The "which sections" question. Add new placements as new link surfaces appear |
| By product | `productVariantId` → e.g. "Sildenafil 50mg × 8" | Their own products only |
| By ranking position shown | `rankPosition` buckets: #1, #2–3, #4–10, lower | Shows how price position drives clicks |
| Your listing now | Their published offers: price, fees verified?, freshness, current rank per product | Same data as the public pages; helps them spot stale or wrong prices |
| Corrections about you | `Correction` rows for their `providerId`: issue + status only | Never the reporter's email |
| Sales & commission *(after Phase 3)* | `CommissionEvent` for their programme: pending / approved / paid | Mirrors what their network reports; helps reconcile |
| CSV export | Same filters | Daily counts only |

## Accounts and access

- **New `PartnerUser` model, separate from `StaffUser`:** email,
  passwordHash, name, `providerId`, active, lastLoginAt, invitedBy,
  invitedAt. The two are kept separate so a partner can never be given a
  staff role by mistake, and staff tooling (role management, audit viewer)
  never lists pharmacy people.
- **One login system, account type in the session:** the NextAuth
  Credentials provider checks `StaffUser`, then `PartnerUser`. The JWT
  carries `kind: "staff" | "partner"` (a discriminated union in
  `src/types/next-auth.d.ts`); staff sessions keep `role`, and partner
  sessions carry `providerId`.
- **Separate area `/partner`:** its own login page, layout and navigation.
  The proxy matcher covers `/partner/:path*`, and the authoritative check
  lives in its layout (same pattern as admin).
- **Invites:** there's no email service in the project yet. A commercial
  manager creates the partner user on the pharmacy's admin page and gets a
  one-time invite link (random token, stored hashed, expires in 7 days)
  to send themselves. Opening the link sets the password. When email is
  added later, the same token is emailed instead.
- **Revocation:** unticking "Affiliate partner" or ending the programme
  does **not** delete the account (they may want past data). A separate
  "Portal access" switch deactivates it. Every create, invite, deactivate
  and login is audit-logged.
- **Later:** two-factor sign-in for partner accounts, and more than one user
  per pharmacy (already supported by the model).
- **Staff "view as pharmacy":** admins can open any pharmacy's dashboard
  read-only for support. This is audit-logged and clearly bannered.

## Data and performance

- Current volumes are fine for live `groupBy` on `ReferralClick`, which is
  already indexed on `(providerId, createdAt)`.
- Add a small `ReferralClickDaily` rollup (provider × day × placement ×
  variant × rank bucket, plus the unique-visitor estimate), written by a
  nightly job alongside `price-collection:run-due`. Two reasons:
  - the unique-visitor figure has to be computed before hashes are cleared
  - dashboards stay fast once there are many partners
- Raw clicks stay 13 months (M7). The rollup can be kept longer, since it
  holds no identifiers.

## Legal and disclosure

- Update the privacy page: we share anonymous, aggregated click counts with
  partner pharmacies, never anything that identifies a visitor.
- The partner agreement or portal terms should say the data is for their own
  use and isn't a ranking lever.
- The partners page ("For pharmacies") can mention that partners get a
  traffic dashboard.

## Build order

| Step | What | Effort |
| --- | --- | --- |
| A ✅ | **Security first:** account type in session; admin layout, proxy and `requireStaffRole` reject non-staff; tests. As built, `getStaffUser()` also re-reads the staff record, so deactivation and role changes apply immediately | done 2026-09-26 |
| B | `PartnerUser` + invite tokens + `/partner/login` + set-password flow + admin "Portal access" card on the pharmacy page | 2 days |
| C | Dashboard v1 from live queries: clicks per day, by section, by product, by rank, listing now, corrections, CSV export | 2–3 days |
| D | Nightly rollup + unique-visitor estimate; move dashboards onto it | 1 day |
| E | Staff "view as pharmacy"; privacy page and partners page copy | 0.5 day |
| F | Sales & commission panel (after referral-earnings Phase 3) | 1 day |

## Decisions needed

1. **One login for everyone or a separate one?** Recommended: one NextAuth
   setup with an account type, plus a separate `/partner` area. The
   alternative is a completely separate auth instance and cookie: stronger
   isolation, but more code to maintain.
2. **Invite by copyable link now, or add an email provider first?**
   Recommended: link now, email later.
3. **Should the unique-visitor estimate be shown at all?** It's
   approximate. Clicks alone are simpler and fully accurate.
4. **Do partners keep portal access after the partnership ends?**
   Recommended: read-only for 90 days, then deactivated.
