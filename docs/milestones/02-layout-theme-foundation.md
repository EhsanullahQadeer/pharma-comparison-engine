# M2 — Layout, Routes/Pages, Content & Theme

**Status:** 🟩 Development-complete — everything buildable without a real domain or real clinical/legal-approved copy is done and verified. Two items remain, and both are genuinely out of reach at any "dev" level: approved clinical/legal/commercial content (needs a real reviewer, not code) and production domain/indexing (needs a real domain to point at).
**Depends on:** M1 (scope)
**Roadmap:** [Milestone 2](../monj-functionality-and-ed-milestones.md#milestone-2--brand-mobile-layouts-and-application-foundation)
**Platform context:** [`00-platform-strategy.md`](00-platform-strategy.md) — everything below was built as the ED vertical's layout/nav/content and stays exactly as-is; it's now read as "vertical #1's content," not "the site's content." The "Route and delivery decisions" line below ("there are no weight-loss or unrelated medicine routes") was a scope boundary for the original ED-only build — it's the thing the pivot deliberately lifts, not a constraint to keep enforcing.

**2026-09-16, later same day — brand/category config layer and empty states/error boundaries built:**

- **Brand/category config** (`src/lib/site-config.ts`) — a `siteConfig` object (`brandName`, `brandShortName`, `tagline`, `activeCategory`) resolved once from `NEXT_PUBLIC_DEPLOYMENT_VERTICAL` (`"ed"` default, or `"weight-loss"`), replacing 8 independent hardcoded `"PharmaCompare"` string literals across the root layout's metadata, `SiteHeader`, `SiteFooter`, the admin sidebar/shell/login card. **Deliberately scoped, not a full multi-tenant rewrite**: `src/lib/ed-pages.ts`'s 43-route content catalogue, the homepage hero copy, and the header's top-bar/CTA strings stay exactly as ED-vertical content — genericizing 43 hardcoded ED articles into a category-driven catalogue is real content-planning work for whenever the weight-loss vertical is actually scheduled (same reasoning `06-content-trust-seo.md` already gives), not a retrofit to do speculatively here. Theme-token swapping per vertical was also left out — inventing weight-loss brand colors with no real design input would be exactly the kind of premature, undirected design decision Code Rule 1 warns against; the shared green-soft theme stays the default until a real one is requested. Verified by running the dev server with `NEXT_PUBLIC_DEPLOYMENT_VERTICAL=weight-loss` and screenshotting: the header logo/tagline correctly swap to "PharmaCompare Weight Loss" / "Weight loss treatment" while the rest of the page (nav, hero, top bar) visibly stays ED content — proving the seam works and honestly showing what's still vertical-specific.
- **Empty states** — new `src/components/common/empty-state.tsx` (`EmptyState`) replaces the same hand-rolled `<p className="text-center text-sm text-muted-foreground">…</p>` pattern that had drifted across the admin dashboard, audit log, product-variants list, pharmacies list, and the corrections review table (5 real call sites, not a speculative component — see AGENTS.md's own `drawer.tsx`/`toggle.tsx` cautionary precedent for adding wrappers with zero call sites). Left two smaller inline notices (evidence/corrections on the provider detail page) untouched since they're a different, more compact visual pattern, not the same "empty list page" shape.
- **Error boundaries** — `src/app/(site)/error.tsx` (renders inside the public site's header/footer chrome, matching `not-found.tsx`/`loading.tsx`'s existing tone) and a root `src/app/error.tsx` fallback for anything outside that group (e.g. admin, which has no error boundary of its own yet). Both are the standard Next.js App Router `error.tsx` convention (`reset()` + a "Try again" button), not a bespoke error-tracking system — dev-level, not a production observability integration.
- Verified with `tsc --noEmit`, `eslint`, `next build` (all clean) and a real Playwright pass: default ED brand strings render correctly, the weight-loss env var visibly changes the header, and the product-variants empty-state search renders the shared component with no visual regression. Spotted the same pre-existing, unrelated search-input hydration warning noted in `03-admin-dashboard-data-model.md` — not touched, out of scope here too.

## What is built

- Existing landing design, imagery and approved green-soft theme preserved.
- Homepage copy now describes the planned UK ED service. Sample customer testimonials, live-service claims and on-site checkout promises have been replaced with product priorities.
- Shared header and footer on every page, with navigation progress and a skip-to-content link.
- Six grouped ED menus: Pharmacies, Prices, Guides, Side Effects, Tools and Trust.
- Desktop disclosure menus and a scrollable mobile accordion, with keyboard access, Escape, outside-click dismissal and active-page styling.
- 50 coming-soon destinations generated from [the route catalogue](../../src/lib/ed-pages.ts). Each describes its purpose and remaining delivery work; no operational listing, import, comparison or form is implied.
- Shared coming-soon layout with breadcrumbs, unique title/description, related pages and first-priority pharmacy links.
- Build-progress overview at `/ed/roadmap`, distinguishing the completed preview from planned directory, prices, content, partnerships and optional later work.
- Persistent preview/CTA bar on ED pages, using truthful preview status rather than unapproved commercial claims.
- ED loading skeleton and a shared not-found page.
- English-only navigation. Multilingual support is not requested and is outside the current scope.

## Route and delivery decisions

All feature routes use the `/ed/` prefix. The original draft routes are preserved where applicable. Treatment explainers sit inside Guides; there are no weight-loss or unrelated medicine routes.

The M6 taxonomy is represented by navigable topic hubs. Individual articles within broad topics (for example the specific non-drug options, interactions or delivery articles) will be added during editorial delivery. This preview does not claim all articles have been written.

Delivery areas identify build priority, not launch dates or new milestone numbers:

1. Pharmacy directory: manual entry, discovery imports and staff review (M3–M4).
2. Price collection and comparison (M5).
3. Scope approvals, reviewed guides, safety, tools and trust (M1/M6; can overlap directory work).
4. Pharmacy partnerships, reporting and pilot launch (M7–M8).
5. Optional retention tools and separately scoped clinical expansion (M9–M10).

Public submission and discovery preview pages explain the plan. Actual staff entry, import controls and approval queues remain in M3/M4 and are not public admin tools.

## SEO and configuration

Every preview route has unique metadata and `noindex, follow`. Preview links remain crawlable so robots can read those directives. The sitemap is generated from the same route catalogue and excludes coming-soon pages and the build-progress overview.

Set `NEXT_PUBLIC_SITE_URL` to the confirmed production HTTPS origin before a public launch. No production domain is assumed: without this setting, the site defaults to noindex, the sitemap is empty and metadata uses localhost as its development base. With a configured origin, the homepage has its canonical URL; preview pages remain noindex.

## Alternatives considered

| Approach | Trade-off |
| --- | --- |
| Custom | Current approach: Next.js routes and shared navigation; full control over comparison UX. |
| Third party | Hosted site builder with embedded comparison; quicker editorial setup but split styling and systems. |
| Hybrid | Custom comparison with externally managed editorial content; remains an option for M6. |

## Checklist

- [x] Framework, theme and landing layout.
- [x] Expanded ED route catalogue and topic hubs.
- [x] Coming-soon page for every catalogue entry.
- [x] Shared page template and global site chrome.
- [x] Desktop and mobile grouped navigation.
- [x] Persistent ED preview/CTA bar.
- [x] ED loading skeleton and not-found page.
- [x] Unique route metadata and route-derived sitemap.
- [x] English-only scope confirmed.
- [x] Data-fetching empty states and error boundaries — `EmptyState` component (5 real call sites) + `(site)`/root `error.tsx` boundaries. Dev-level: standard Next.js `error.tsx` convention, not a production error-tracking integration.
- [ ] Approved clinical, legal and commercial content replacing feature previews. **Not a dev-vs-production gap** — this needs a real clinical/legal reviewer's sign-off regardless of environment; not something to fabricate at any level. Stays open until M1's named-clinical-reviewer open question (see `06-content-trust-seo.md`) is answered.
- [ ] Production domain configured and launch indexing reviewed. Explicitly out of scope for a dev-level pass — needs a real domain to point `NEXT_PUBLIC_SITE_URL` at.
- [x] Brand/category config layer — `src/lib/site-config.ts`, env-driven (`NEXT_PUBLIC_DEPLOYMENT_VERTICAL`), verified switching brand name/tagline at runtime. Scoped to brand identity only — the ED route catalogue/content and theme colors are deliberately not genericized yet (see note above).

## Validation

Production build, TypeScript build checks and lint pass. Browser checks cover desktop/mobile navigation, disclosure dismissal, mobile overflow, all 50 route responses, unique page titles, one h1 per page, noindex metadata, unknown-route 404s, robots and sitemap. Screenshots were inspected at desktop and mobile sizes.
