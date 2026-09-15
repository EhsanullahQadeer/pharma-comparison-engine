# M2 — Layout, Routes/Pages, Content & Theme

**Status:** In progress — navigation and route preview complete; launch content and remaining shared states pending.
**Depends on:** M1 (scope)
**Roadmap:** [Milestone 2](../monj-functionality-and-ed-milestones.md#milestone-2--brand-mobile-layouts-and-application-foundation)

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
- [ ] Data-fetching empty states and error boundaries when live services are introduced.
- [ ] Approved clinical, legal and commercial content replacing feature previews.
- [ ] Production domain configured and launch indexing reviewed.

## Validation

Production build, TypeScript build checks and lint pass. Browser checks cover desktop/mobile navigation, disclosure dismissal, mobile overflow, all 50 route responses, unique page titles, one h1 per page, noindex metadata, unknown-route 404s, robots and sitemap. Screenshots were inspected at desktop and mobile sizes.
