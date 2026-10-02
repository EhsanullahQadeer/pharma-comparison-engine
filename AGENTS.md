# AGENTS.md

## Project Summary

**pharma-comparison-engine** is a UK erectile-dysfunction (ED) medication
price comparison platform (Next.js 16 / React 19 / Prisma 7 / Postgres). The
public site (`src/app/(site)`) is currently a marketing/coming-soon preview;
the real, actively-built system is the staff admin dashboard
(`src/app/admin`) that runs a discovery → verification → product-match →
price-collection → publish pipeline:

1. **Discovery** — adapters (`src/lib/discovery/adapters`) pull candidate
   pharmacies from public registries (GPhC, NHSBSA, CQC, NHS ODS, Companies
   House) into `DiscoverySource` → `DiscoveryRun` → `DiscoveryCandidate`
   rows, optionally enriched via Google AI Mode website discovery.
2. **Verification/review** — staff review `DiscoveryCandidate`s on
   `/admin/reviews` and promote or reject them; promoting creates a
   `Provider` (+ `ProviderIdentifier`, `Evidence`) starting at
   `ProviderStatus.DISCOVERED`. `ProviderStatus` only ever advances through
   an explicit staff action (`DISCOVERED → IDENTITY_VERIFIED →
   ED_CATALOGUE_VERIFIED → PUBLISHED → TEMPORARILY_WITHHELD/ARCHIVED`) —
   nothing auto-publishes.
3. **Product detection** (`src/lib/product-detection`) — matches a verified
   provider's own site (sitemap/URL paths, never body text) against ED
   ingredient tokens (`Ingredient.SILDENAFIL`/`TADALAFIL`), producing
   `ProductMatch` rows staff confirm against an exact `ProductVariant`.
4. **Price collection** (`src/lib/price-collection`) — scrapes a confirmed
   match's own schema.org `Product`/`Offer` structured data (GBP only), or a
   rendered-page fallback, or a human-assisted CDP/Chrome session for
   Cloudflare-gated sites; writes `PriceHistory` and an `Offer` that is
   always created unpublished. Can run manually or via a scheduled
   `PriceCollectionJob` (`npm run price-collection:run-due`).
5. **Publish** — staff manually publish an `Offer`; there is no public
   comparison UI reading `Offer` data yet.

Staff roles (`StaffRole`): `CATALOGUE_EDITOR`, `CONTENT_REVIEWER`,
`ADMINISTRATOR`, `COMMERCIAL_MANAGER`, gated via `requireStaffRole`
(`src/lib/staff-auth.ts`) on every server action that confirms/promotes/
publishes. Auth is NextAuth (`src/auth.ts`, credentials-based staff login).
See [`docs/implementation-plan.md`](docs/implementation-plan.md) for the
full target architecture and [`docs/current-tasks.md`](docs/current-tasks.md)
for what's actually built vs. in progress.

## UI Rules

1. **Reusability first.** Before building a new component, check if an
   existing one (or a small generalization of it) already covers the case.
   Prefer composing existing primitives over copy-pasting markup.
2. **Loading states use skeletons.** Any view/component that fetches async
   data must show a skeleton placeholder matching its final layout — never a
   bare spinner or blank screen — to avoid layout shift. `common/skeleton.tsx`
   is the primitive to build these from.
3. **Theme consistency.** All new UI must use existing theme tokens (Tailwind
   config colors, spacing, fonts) — no hardcoded hex colors or one-off
   spacing values that bypass the design system. Support light/dark (this
   app has `common/theme-toggle.tsx` and a `src/lib/theme-store.ts`).
4. **Match existing patterns.** Follow the visual and interaction conventions
   already established in sibling admin components (modals, empty states via
   `common/empty-state.tsx`, badges via `common/badge.tsx`) rather than
   introducing a new style per feature.
5. **Responsive by default.** New UI must work across mobile/tablet/desktop
   breakpoints already used in the project — no fixed-width layouts that
   break on smaller breakpoints.
6. **Build forms with `FORM`/`FormFeilds` (`src/components/common/form.tsx`)
   on top of react-hook-form + zod.** `FORM` wraps `useForm`/`FormProvider`
   and submit handling (incl. scroll-to-first-invalid-field on validation
   error); `FormFeilds` wires a single `Controller`-bound field into
   `ui/field.tsx`'s `Field`/`FieldLabel`/`FieldError`. This is the **only**
   form wrapper in the app — every existing form (`provider-form.tsx`,
   `offer-form-modal.tsx`, `product-variant-form-modal.tsx`,
   `discovery-source-form-modal.tsx`, `staff-form-modal.tsx`,
   `login-form.tsx`) already uses it; don't hand-roll `useForm`/`zodResolver`
   wiring or introduce another form component.
7. **Confirm before destructive actions with `confirm()` from
   `src/lib/confirm-store.ts`** — `await confirm({ message, title?,
   confirmText?, cancelText?, variant? })` resolves to `boolean`. It's a
   plain function backed by a global external store (same pattern as
   `src/lib/route-progress.ts`), not a React context/provider — call it from
   anywhere (event handlers, hooks) with no wrapping required. The dialog
   itself renders once via `<ConfirmDialogHost />`
   (`src/components/common/ConfirmDialogHost.tsx`, mounted in the root
   `src/app/layout.tsx`) using the `common/modal.tsx` wrapper. Don't use
   `window.confirm` or write a new one-off confirmation modal.
8. **New/changed code wraps shadcn primitives in `@/components/common`
   instead of importing `@/components/ui/*` directly.** `src/components/common`
   holds one generic wrapper per reusable UI concern:
   - **`Input`** (`common/input.tsx`) — one component covering
     text/password/textarea/select via a `type` prop, wrapping
     `ui/input.tsx`/`ui/textarea.tsx`/`ui/select.tsx` (`common/select.tsx`
     also exists standalone for select-heavy use like the discovery
     candidate table's inline editors).
   - **`Modal`** (`common/modal.tsx`) — wraps `ui/dialog.tsx` behind a
     shared API: `open`/`defaultOpen`/`onOpenChange` for
     controlled-or-uncontrolled use, `disabled`, `trigger` (a single
     `ReactElement` wired via `asChild`), `closeOnOutsideClick`, and a
     `children` render-prop `({ close }) => ReactNode` — or a single
     `ReactElement` that gets `close` cloned onto it — so content can close
     the overlay without reaching into unrelated state.
   - **`Table`** (`common/table.tsx`) — wraps `ui/table.tsx`, re-exporting
     `TableHeader`/`TableBody`/`TableFooter`/`TableRow`/`TableCell`/
     `TableCaption` and enhancing `Table`/`TableHead` with optional column
     resizing and sorting. Use this for every data table instead of
     importing `ui/table.tsx` directly.
   - **`FORM`/`FormFeilds`** (`common/form.tsx`) — the canonical form
     wrapper on top of react-hook-form + zod; see Rule 6 above.
   - **Thin pass-through wrappers that exist today** —
     `common/card.tsx`, `common/button.tsx`, `common/label.tsx`,
     `common/checkbox.tsx`, `common/command.tsx`, `common/sheet.tsx`,
     `common/badge.tsx`, `common/avatar.tsx`, `common/dropdown-menu.tsx`,
     `common/tooltip.tsx`/`TooltipWrapper.tsx`, `common/empty-state.tsx`,
     `common/skeleton.tsx`, `common/mutate-button.tsx`,
     `common/pagination.tsx`/`PaginationServer.tsx`,
     `common/theme-toggle.tsx`, `common/input-fields.tsx`,
     `common/popover.tsx`. Import from these
     instead of `ui/*` directly. There is currently no `common/` wrapper for
     `ui/calendar.tsx`/`ui/separator.tsx`/`ui/alert.tsx` —
     if a feature needs one of those, add a thin wrapper to `common/` rather
     than importing the `ui/*` primitive directly, following the same
     pattern as the existing thin wrappers.
9. **Icons come from `lucide-react`, used directly.** There is no
   project-specific SVG icon set under `public/` — import icons from
   `lucide-react` (already used throughout `src/components/ui`, the admin
   list pages, and `AdminShell`) rather than adding new SVG assets or a
   wrapper component for them.

## Code Rules

1. **Check current docs via Context7 before using an unfamiliar Next.js,
   Prisma, NextAuth, Shadcn, or Tailwind API.** Before writing code against a
   feature you're not certain is current (APIs change between major versions
   — this repo is on Next.js 16 / React 19 / Prisma 7 / Tailwind v4), use the
   `context7` MCP tool to pull up-to-date documentation instead of relying on
   possibly-outdated training knowledge. Skip this for basic, stable usage
   you're already confident about — it's for cases where getting the API
   wrong is a real risk.
2. **All data access goes through `src/actions/**` server actions — never
   query Prisma directly from a page/component, and never add a REST route
   for internal data** (the exceptions are `src/app/api/discovery` and
   `src/app/api/auth`, which are genuine external/NextAuth integration
   points, and `src/app/go/[offerId]`, the public outbound-click redirect —
   its data access lives in `src/actions/referrals/outbound-clicks.ts`,
   which is intentionally *not* a `"use server"` module so click-writing
   isn't exposed as a callable endpoint). Actions are colocated by domain
   (`src/actions/analytics`, `audit-log`, `auth`, `corrections`,
   `discounts`, `discovery`, `evidence`, `offers`, `price-collection`,
   `product-matches`, `product-variants`, `providers`, `staff`); add to or
   extend the matching domain's actions rather than reaching for
   `src/lib/prisma.ts`'s Prisma client from a component. This keeps
   `requireStaffRole` auth/session checks and provider-status/evidence
   gating centralized instead of duplicated per call site.
3. **No unwanted re-renders.** Memoize callbacks/values passed to children
   (`useMemo`/`useCallback`) where it prevents unnecessary re-renders, keep
   context values stable, and avoid creating new object/array literals
   inline in props when it causes child re-renders.
4. **Prefer server-side rendering.** Pages/components should be React Server
   Components by default — only add `"use client"` for the specific leaf
   component that actually needs interactivity/state/browser APIs, not for
   the whole page. This is the dominant pattern already: admin list pages
   (`pharmacies`, `staff`, `discovery-sources`, `reviews`, `audit-log`) fetch
   directly via `await getX()` server actions in the async page body (often
   `Promise.all`'d) rather than client-side `useEffect`/fetch calls.
5. **No duplicate code.** Extract shared logic into a hook/util/component
   instead of copy-pasting; if you're about to paste a block that already
   exists elsewhere, factor it out instead.
6. **No dead code.** Don't leave unused variables, commented-out blocks, or
   unreachable branches behind.
7. **Type safety.** No `any` unless truly unavoidable; keep `src/types/` as
   the **only** place for shared domain `type`/`interface` declarations
   (currently `discovery.ts` plus `next-auth.d.ts` for session typing — add
   new domain files here, e.g. `provider.ts`, `pricing.ts`, as the app
   grows). Don't create a `types.ts` (or `*.types.ts`) file inside
   `src/components/**`, `src/actions/**`, `src/hooks/**`, or `src/lib/**` —
   add the shape to the matching (or a new) file in `src/types/` instead.
   Types genuinely private to one component/hook and never reused can stay
   inline in that file — the rule is against a colocated `types.ts` that
   becomes a second, competing home for domain types (enforced by eslint,
   currently `warn` — see `eslint.config.mjs`). Exception: a file that
   exports a runtime zod schema alongside its `z.infer` type (e.g.
   `src/actions/providers/provider-schema.ts`) is a validation schema, not a
   type file — it stays colocated with the action that uses it for parsing,
   not moved to `src/types/`. No `index.ts` barrel in `src/types/` (Rule 14).
8. **Scoped changes.** Don't refactor unrelated code while fixing a bug or
   adding a feature — keep diffs focused on the task at hand.
9. **File size limit — 600 lines.** No file should grow past ~600 lines. If a
   file is approaching or exceeding this, split it into smaller chunks
   (extract sub-components, hooks, or utils into their own files) instead of
   continuing to grow it in place.
10. **Object maps over if/else and switch chains.** For toggling between
    components, values, or data based on a key (variant/type/status
    switches — e.g. `ProviderStatus`, `DiscoveryCandidateStatus`,
    `ProductMatchStatus`, `PriceScrapeStatus`), use an object map
    (`{ key: value }[selector]`) instead of long `if`/`else if` or `switch`
    chains. `src/lib/provider-labels.ts`, `src/lib/discovery-labels.ts`,
    `src/lib/review-labels.ts`, `src/lib/staff-role-labels.ts` and
    `src/lib/catalogue-labels.ts` are the existing label/variant map files —
    extend the matching one instead of inlining a new switch.
11. **`useReducer` for interdependent state.** If a component has multiple
    `useState` hooks whose values update together or must stay in a valid
    combination (e.g. a scrape run's `status`/`data`/`error`), consolidate
    them into a single `useReducer` instead — it centralizes the transition
    logic and prevents invalid state combinations. Don't apply this just
    because a component has several `useState` calls — unrelated,
    independent pieces of state (e.g. a modal toggle next to an unrelated
    sort order) should stay as separate `useState` hooks; forcing them into
    one reducer adds indirection without benefit.
12. **No chained/nested ternaries; watch `&&` falsy values.** A single
    `cond ? <A/> : <B/>` or `cond && <A/>` is fine and idiomatic — don't
    object-map those. But chained/nested ternaries
    (`cond1 ? <A/> : cond2 ? <B/> : <C/>`, 3+ branches) are a switch in
    disguise — use an object map or early returns instead. With `&&`,
    coerce non-boolean conditions (`count && <Badge/>` renders a literal `0`
    when `count` is `0`) — use `count > 0 && ...` or `!!count && ...`.
    When building an object map: default to plain elements
    (`{ active: <Comp/>, inactive: <Comp2/> }[key]`); if a branch reads
    data that's only valid/defined for that branch (so other branches would
    throw or do wasted work if constructed eagerly), wrap each branch in a
    function and call the selected one instead
    (`{ active: () => <Comp data={x.value}/>, inactive: () => <Comp2/> }[key]()`).
13. **Wrap multi-step business writes in `prisma.$transaction`, and gate any
    write that confirms/promotes/publishes on `requireStaffRole`.** Follow
    the pattern already used in `src/actions/providers/providers.ts`,
    `src/actions/discovery/discovery-candidates.ts`,
    `src/actions/product-matches/product-matches.ts` (implicitly, via
    offers/price-collection), `src/actions/offers/offers.ts` and
    `src/actions/discounts/discounts.ts`: any action that touches more than
    one table as a single logical operation (e.g. promoting a
    `DiscoveryCandidate` into a `Provider` + `ProviderIdentifier` +
    `Evidence`, or a price collection writing an `Offer` + `PriceHistory`
    row) must run inside `prisma.$transaction` so it can't leave the
    database in a half-written state. Any action that changes
    `ProviderStatus`, confirms a `ProductMatch`, or publishes/edits an
    `Offer`/`Discount` must call `requireStaffRole` (`src/lib/staff-auth.ts`)
    with the appropriate role first — don't add a new write path that
    bypasses this gate. Staff pages that need the signed-in user call
    `getStaffUser()` (same file), never a bare `auth()`: a session alone
    isn't proof of staff (partner-portal accounts will share the login),
    and `getStaffUser()` also re-checks the account is still active and
    reads the current role. `Offer`s created by price collection must stay
    unpublished (`publishedAt: null`) until a staff member explicitly
    publishes them — never auto-publish a scraped price.
14. **No barrel/index re-export files.** Import each component/util directly
    from the file it's defined in (e.g. `@/components/admin/provider-form`,
    `@/components/common/table`) — never add or import through an
    `index.ts` that re-exports a folder's contents. Barrels drift out of
    sync with the folder and weaken tree-shaking/module splitting in
    Next.js. If you find one, delete it rather than keeping it updated.
15. **Navigate with `@/components/Link` and `@/hooks/useRouter`, never
    `next/link`/`next/navigation` directly.** Every in-app navigation (link
    clicks and programmatic `push`/`replace`/`back`/`forward`) must show the
    top route-progress bar (`src/components/RouteProgressBar.tsx`, driven by
    `src/lib/route-progress.ts`'s `start()`/`done()`). `@/components/Link`
    and `@/hooks/useRouter` are drop-in wrappers around `next/link`'s `Link`
    and `next/navigation`'s `useRouter` that call `start()` on navigation —
    importing the underlying Next.js versions directly bypasses that and the
    navigation happens with no loading feedback. `next/navigation`'s
    `usePathname` is unaffected by this rule (it doesn't trigger navigation)
    and can be imported directly. This app is English-only — there is no
    locale-routing layer to route through.
16. **List/table pages fetch data server-side and render directly with
    `common/card.tsx` + `common/table.tsx` — there is no shared "canonical
    list-page" scaffold component in this app yet.** The established shape
    across the current admin list pages (`pharmacies`, `staff`,
    `discovery-sources`, `audit-log`, `reviews`' per-tab tables) is: the page
    (or a dedicated table component under `src/components/admin/`, e.g.
    `discovery-candidate-review-table.tsx`, `product-match-review-table.tsx`,
    `evidence-review-table.tsx`, `correction-review-table.tsx`,
    `discovery-sources-table.tsx`) fetches via the matching `src/actions`
    call(s), wraps the result in `Card`/`CardHeader`/`CardTitle`/
    `CardContent` (`common/card.tsx`, used directly, not through a
    generic wrapper), and renders rows with `Table`/`TableHeader`/
    `TableBody`/`TableHead`/`TableRow`/`TableCell` from `common/table.tsx`
    with hand-written `<TableHead>` columns per page (no column registry —
    `src/hooks/table-columns-registry.ts` exists as scaffolding but is
    currently an empty `Record`, unused). Use `common/empty-state.tsx` for
    the zero-results state. **Every admin table has a page-size picker,
    pagination and sortable column headings.** A table that already holds
    all its rows (most of them) uses `useTableView(rows, sorters)`
    (`src/hooks/useTableView.ts`): render `view.rows`, spread
    `view.sortProps("key")` onto each sortable `TableHead`, and put
    `<TableViewPagination pagination={view.pagination} />`
    (`common/table-view-pagination.tsx`) under the table; that needs a
    client component, so a server page hands its rows to a table component
    under `src/components/admin/`. A list the database pages (`audit-log`,
    `catalogue/product-variants`) uses `common/PaginationServer.tsx` +
    `parsePageSize` (`src/lib/pagination.ts`) and `UrlSortTableHead`
    (`common/url-sort-table-head.tsx`), with `parseSort`
    (`src/lib/table-sort.ts`) passed to an `orderBy` map inside its action.
    Columns holding only buttons or free text stay unsortable; with tick
    boxes, selection and bulk actions cover every row, not just the page on
    screen. Public-site tables are
    exempt (they are ranked by design). Don't invent a
    new `CardWrapper`/registry abstraction speculatively — if a real,
    repeated need for one emerges across several pages, add it deliberately
    with real call sites in the same change, the same way `common/card.tsx`
    and the other thin wrappers were added.
17. **Client-side data access goes through the `useQuery`/`useMutate` hooks
    (`src/hooks/useQuery.ts`/`useMutate.ts`) once a client component needs
    it — registries exist but are barely populated yet.**
    `src/hooks/query-registry.ts` is currently an empty scaffold (no query
    keys registered — every list page today fetches server-side per Rule 4
    instead) and `src/hooks/mutation-registry.ts` has exactly one entry,
    `scrapePricesForVariant`. When a client component genuinely needs to
    read or write past the initial server render, add the action to the
    matching registry (`useQuery("key", [args], { enabled?, initialData? })`
    for reads, `useMutate("key", { invalidateKeys, onSuccess?, onError? })`
    for writes) rather than calling a server action directly from a client
    component or hand-rolling fetch/refetch state — this is the established
    convention even though adoption is still small. Benefits: one place to
    see every data source, automatic refetch after mutations
    (`invalidateKeys`), stale-response protection, and server-seed support
    (`initialData`). Exceptions: imperative one-shot reads triggered only by
    a button/scan event and pure server components' direct `await` in the
    async page body (the current norm per Rule 4).
18. **Browser automation uses `patchright` only — never `playwright`.**
    This is mandatory. Import `chromium`/`Page`/`Browser` etc. from
    `"patchright"` in app code, scripts, tests and throwaway checks alike;
    never add `playwright`, `playwright-core` or any `@*/playwright`
    integration package (e.g. `@axe-core/playwright`) as a dependency — use
    the underlying library directly through a patchright page instead (see
    `scripts/a11y-scan.ts`, which injects `axe-core` itself). Note that
    patchright's `page.evaluate` runs in an **isolated world by default**:
    DOM reads work as usual, but anything injected into the page's own JS
    (`addScriptTag`, page globals like `window.axe`) is only visible if you
    pass `isolatedContext = false` as the 4th argument
    (`page.evaluate(fn, arg, undefined, false)`).

## SEO Rules

1. **Every route sets its own metadata — no shared/duplicate titles.** Export
   `metadata` (static) or `generateMetadata()` (dynamic — needed whenever the
   title/description depends on fetched data, e.g. a specific provider or
   article page) from every route segment. Each page needs a unique,
   descriptive `title` and `description`; never leave a dynamic page
   inheriting the parent layout's generic title. Internal admin routes use
   `robots: { index: false, follow: false }` in their metadata instead (see
   the existing `admin/(dashboard)/*` pages) — they still need a distinct
   `title` for the browser tab/history, just not public indexing.
2. **Set a canonical URL on every indexable page.** Use `alternates.canonical`
   in that page's metadata. This matters especially for any page reachable
   through multiple query-string variants (filters, sort order, pagination)
   — the canonical must point at the primary, filter-less URL so search
   engines don't treat each filter combination as a separate duplicate page.
3. **`app/sitemap.ts` and `app/robots.ts` are generated from real route data,
   never hand-maintained.** Use Next's built-in `MetadataRoute.Sitemap` /
   `MetadataRoute.Robots` conventions, sourcing the URL list from the same
   place the app itself derives its routes (e.g. published `Provider`/
   `Article` rows) — a sitemap that drifts from the actual published pages
   is worse than no sitemap. Exclude non-indexable pages (`/admin/**`,
   auth routes) via `robots.ts`, not by simply omitting them from the
   sitemap and hoping crawlers don't find them another way.
4. **One `<h1>` per page, logical heading order, semantic landmarks.** Don't
   skip heading levels (`h1` → `h3` with no `h2`) and don't use heading tags
   for visual sizing alone — pick the tag for its place in the document
   outline, style it separately. Use `<nav>`, `<main>`, `<header>`, `<footer>`
   semantically rather than generic `<div>`s for page chrome; this overlaps
   with accessibility, not just SEO, and the same markup serves both.
5. **Every meaningful image gets real `alt` text; decorative images get
   `alt=""`.** Never leave `alt` empty on an image that conveys information,
   and never stuff it with keywords unrelated to what the image actually
   shows. Use `next/image` for all content images so responsive sizing and
   lazy-loading below the fold are automatic — this also directly helps
   Core Web Vitals (LCP), which is itself a ranking factor.
6. **Structured data (JSON-LD) only describes what's actually true.** Where a
   schema.org type genuinely fits (e.g. `Article` for the `Article` model's
   published content, `BreadcrumbList` for navigation, `FAQPage` for a real
   FAQ section), add it as a `<script type="application/ld+json">`. Never
   fabricate or inflate fields to look more attractive to search engines
   (fake ratings, invented review counts, a `datePublished` that doesn't
   match the real publish date) — this is both a Google guidelines
   violation and, given this is a health/medicine-adjacent product, a
   credibility risk that matters more than the SEO upside. This applies
   doubly to pricing/`Offer` data once the public comparison UI exists —
   only surface prices actually confirmed via the price-collection pipeline
   (Project Summary above), never a placeholder or estimated figure.
7. **Prefer Server Components and server-side data fetching for indexable
   content pages** (already Code Rule 4) — content that only renders after a
   client-side fetch may not be seen by crawlers reliably, and server
   rendering is also what makes fast Core Web Vitals achievable in the
   first place. Reserve `"use client"` for genuinely interactive leaf
   components, not the page shell that holds the crawlable content.
8. **No orphan pages.** Every route meant to be indexed must be reachable via
   real internal navigation (nav menu, footer, breadcrumbs, or contextual
   in-content links) — a page that only exists in the sitemap with no
   internal links pointing to it is a weak signal to search engines and a
   dead end for users who land on it directly.
9. **Clean, descriptive, stable URL slugs.** Use kebab-case, human-readable
   path segments (`/ed/pharmacies/click-pharmacy`, not `/p?id=42`) for
   anything meant to be indexed and shared. Once a page is published and
   indexed, changing its slug means adding a redirect (`next.config.ts`'s
   `redirects()` or middleware) — don't silently break inbound links/search
   rankings by renaming a live route's path with no redirect.

---

## Change Documentation

Every change to functionality or UI must be logged in
[`docs/new-updates-summary.md`](docs/new-updates-summary.md), newest entry on
top. Log started 2026-07-17 and continues going forward with every
functional/UI update — this is the running changelog for the project.

**This doc is written for the client, not for developers.** The client is
non-technical, so every entry must read like a plain-language product update,
not a commit log:
- No file paths, component/function names, table names, or code identifiers
  (e.g. write "the admin Reviews page" not `ReviewsPage.tsx`).
- No git/dev jargon ("uncommitted", "refactor", "restructure", "hook",
  "endpoint", "migration").
- Describe *what changed for the user* (what they'll see or be able to do),
  not *how it was implemented*.
- Group entries under the same date headings as before; skip purely internal
  changes (dev docs, internal tooling, code cleanup with no visible effect)
  entirely rather than translating them into vague filler.
- Keep each bullet short and concrete — one user-visible change per bullet.

## Task Tracking (multi-window / cross-session continuity)

Work on this project happens across multiple Claude windows/sessions, and any
session can hit its usage limit mid-task. [`docs/current-tasks.md`](docs/current-tasks.md)
is the shared source of truth for what's in progress, what's next, and what's
done — it lets a new window pick up exactly where a cut-off session left off,
and lets concurrent windows avoid stepping on the same task.

Rules:
1. **Check it first.** Before starting work, read `docs/current-tasks.md` to
   see if the task (or something touching the same files) is already in
   progress in another window.
2. **Claim before starting.** When you start a non-trivial task, move it into
   "In Progress" with today's date and a one-line note of the approach.
3. **Leave a resumable trail.** Whenever a task is left incomplete (limit hit,
   context cut off, or paused by the user), update its entry with exactly
   what's done, what's left, and the next concrete step — specific enough
   that a fresh session with no memory of this conversation can continue
   without re-deriving context.
4. **Close it out.** When a task is finished, move it to "Done" with the
   completion date, and record it in `docs/new-updates-summary.md` per the
   Change Documentation rule above.
5. **Keep it current.** Stale or duplicate entries should be cleaned up as
   they're encountered, not left to accumulate.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
