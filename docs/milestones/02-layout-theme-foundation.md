# M2 — Layout, Routes/Pages, Content & Theme

**Status:** 🟨 In progress
**Depends on:** M1 (scope)
**Roadmap:** [monj-functionality-and-ed-milestones.md § Milestone 2](../monj-functionality-and-ed-milestones.md#milestone-2--brand-mobile-layouts-and-application-foundation)

## What we're building

The public-facing application shell everything else gets built inside of: page layouts, the route map, shared UI primitives, and the visual theme.

- Marketing/landing homepage — **done**
- Design theme: colors, radius, fonts, shadows — **done**
- Full public route map for the ED comparison journey — **not started** (currently only `/` exists)
- Shared layout patterns: header/nav, footer, section containers — header/footer done, reusable page *templates* not started
- **Mega-menu navigation** for Guides / Side Effects / Tools / Trust — **not started, not yet designed**. Our current header is 4 flat links; Monj's reference navigation is 4 multi-column dropdown menus covering ~80+ pages (see [`06-content-trust-seo.md`](06-content-trust-seo.md) for the content taxonomy those menus need to expose). This is a bigger nav component than currently scoped and needs its own design pass, plus a mobile equivalent (likely an accordion, not a dropdown).
- **Sticky trust/CTA bar** — **not started**. Observed on Monj as a persistent bottom bar ("Lowest total patient price. No paid placement." + a compare CTA) that stays visible while scrolling article/guide pages. Worth adopting as a trust signal + conversion path, adapted to our own claim (independence, no paid placement).
- Shared states: loading skeletons, empty states, error boundaries, 404s — **not started**
- Mobile navigation — nav links render, but there's no mobile drawer/menu yet, and now also needs to fit the mega-menu content above
- Content: real, reviewed copy for each route — currently placeholder marketing copy only

## How we're building it

- **Framework** — Next.js 16 App Router, one route segment per public page under `src/app/`, mapped from [`src/lib/ed-pages.ts`](../../src/lib/ed-pages.ts) — the route registry already lists the intended path set across five groups (pharmacies, prices, treatments, guides, about) with a `phase` tag per page.
- **Styling** — Tailwind v4 + shadcn/ui (`components.json`, `src/components/ui/*`). Theme tokens are defined once in [`src/app/globals.css`](../../src/app/globals.css) (`:root` / `.dark`) and consumed everywhere through Tailwind utilities (`bg-primary`, `text-muted-foreground`, `shadow-(--shadow)`, etc.) — no hardcoded colors in components.
- **Component organisation** — landing-only sections currently live under `src/components/marketing/*`. As real routes get built, split into `src/components/layout/*` (site chrome shared by every page), `src/components/marketing/*` (homepage-only), and `src/components/ed/*` (comparison-journey pages) rather than growing one folder indefinitely.
- **i18n note** — English/Urdu support was scaffolded with `next-intl` by a parallel effort but was removed because it broke the build with no message files behind it yet. The route-progress-bar plumbing that depended on it (`src/components/Link.tsx`, `src/hooks/useRouter.ts`, `src/components/RouteProgressBar.tsx`) was kept and de-i18n'd, so it's ready to be re-wrapped if/when `next-intl` comes back as a real dependency with `src/messages/{en,ur}/*.json` populated.

## Alternatives considered

| Approach | Trade-off |
| --- | --- |
| Custom — build the interface and staff foundations directly in this Next.js project | Most control; more initial development. **This is the approach in use.** |
| Third party — hosted site builder/CMS embedding a separately maintained comparison experience | Faster content prototype; split systems and styling limits |
| **Hybrid (recommended by roadmap)** — custom comparison UI with externally managed editorial content | Flexible experience; needs CMS integration later (see M6) |

## Checklist

- [x] Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui scaffolded
- [x] Theme tokens (colors, radius, shadow, fonts) matching the approved palette
- [x] Landing page: header, hero, feature grid, comparison section, testimonials, flow diagram, footer
- [x] Route registry drafted (`src/lib/ed-pages.ts`)
- [ ] `ed-pages.ts` route registry expanded to cover the full Guides / Side Effects / Trust taxonomy from `06-content-trust-seo.md` (currently only 19 top-level entries; the mega-menu content implies dozens more)
- [ ] Real page routes created for every entry in the (expanded) route registry
- [ ] Shared page layout/template (title, breadcrumb, container) for comparison-journey pages
- [ ] Mega-menu nav component (desktop) for Guides / Side Effects / Tools / Trust
- [ ] Mobile equivalent of the mega-menu (accordion or similar — a dropdown won't work at phone width)
- [ ] Sticky trust/CTA bar component
- [ ] Loading-skeleton, empty-state and error-boundary components
- [ ] Real, reviewed copy replacing placeholder marketing copy
- [ ] Decision on, and re-implementation of, en/ur i18n if still required

## Open questions

- Confirm the intended meaning of `phase: 1/2/3` in `ed-pages.ts` — build order, or launch gating? Now more pressing given the taxonomy in `06-content-trust-seo.md` will roughly double-or-more the registry's size.
- Is Urdu support required for initial launch or a fast-follow? Affects whether to re-add `next-intl` now or defer it.
- Does the mega-menu need to ship before launch, or can Guides/Side Effects start as a simpler flat list and grow into a mega-menu once enough articles exist to justify one? A near-empty 4-column dropdown looks worse than a short flat list.
