# M0 — Platform Strategy: Multi-Vertical, Brand-Per-Domain

**Status:** 🟨 Decision recorded; schema work not started
**Depends on:** None — this reframes M1 and above
**Recorded:** 2026-09-16, per client direction

## What changed

Every milestone file up to this point (`01`–`10`) was written for a single product: an anonymous UK erectile-dysfunction (ED) price-comparison site. The client has redirected the strategy:

> "our plan is to create a web just like monj.uk irrespect of product and our main focus is brand not ed, weight loss etc. we target viagra, mounjaro etc. our main core focus is to get pharmacies list through api/scraping and product price, discount through scraping so after that we can deploy this app with select products with different domains and change content according to product but core feature is same"

In plain terms: the product being built is not "an ED site." It's **a reusable pharmacy price-comparison engine** — provider discovery (API/scraping), price/discount collection, and delivered-total calculation — that gets **deployed once per brand/domain**, each instance configured to show one (or a curated set of) product categories with its own branding and content. ED (sildenafil/tadalafil, already built) is the first vertical; weight-loss (tirzepatide/Mounjaro, semaglutide/Wegovy) is the named second. More categories can follow without rebuilding the core.

The engine is the asset. Content and branding are configuration on top of it.

## Confirmed purpose: independent price comparison (2026-09-16)

The platform serves users comparing pharmacy prices. Credibility comes from accurate product matching, transparent costs, current evidence and corrections. It is not a marketing platform for referral partners. This principle applies at launch and after growth.

- Rank eligible equivalent offers by price ascending, using a disclosed cost basis and a neutral deterministic tie-break. Verification and freshness determine eligibility, not a weighted promotional score.
- Include qualifying providers regardless of commercial relationship. No paid placement, partner-first ordering, commission-based tie-breaks or commercial preference in coverage, refresh priority or presentation.
- Show known item prices as indicative when complete costs are unavailable; do not mix incomplete item prices into a verified delivered-total ranking or claim complete market coverage.
- Launch with no referral partners and no assumed referral income. Any future affiliate arrangement is optional, disclosed and isolated from the comparison logic; the platform must remain fully useful without it.
- Prioritize source coverage, reliable collection, fair arithmetic, evidence dates and user corrections over attribution or commercial dashboards. Provider links are a user utility.

## Two assumptions locked in for planning purposes

These aren't fully client-confirmed — they're the most defensible reading of the direction above, stated explicitly so they can be corrected rather than silently baked into every downstream doc:

1. **Deployment model — one codebase, one database per domain.** Each brand/domain is its own deployment (own Postgres instance, own env config), not one multi-tenant database serving several live domains simultaneously. Reasoning: simpler operationally at pilot scale, avoids cross-brand data/compliance leakage (different brands may have different providers, different affiliate terms, different legal review status per §M1), and matches "deploy this app... with different domains" read literally. Per-domain env config selects: brand name, theme tokens, which `ProductCategory`/ies are shown, and which content set (guides/side-effects taxonomy) is active.
2. **Sequencing — generalize the core, don't rebuild it.** ED stays the first vertical to reach pilot; it already has schema, admin tooling, navigation and a content taxonomy built (M2, M3a, M6). The immediate work is making the *shared* layer (schema, discovery adapters, price engine) category-aware so a second deployment (weight-loss) can stand up without redoing the provider-discovery/scraping/pricing engine from scratch. Not building two verticals from a blank slate in parallel.

## What "core same, content different" means concretely

### Data model (reopens part of M3a — see `03-admin-dashboard-data-model.md`)

`prisma/schema.prisma` today has no concept of product category at all — `Provider`, `ProductVariant`, `Offer` are flat and implicitly ED-only (`Ingredient` enum is `SILDENAFIL | TADALAFIL`). This needs:

- A `ProductCategory` enum (start with `ERECTILE_DYSFUNCTION`, `WEIGHT_LOSS`; extensible without a schema rewrite per new category).
- `ProductVariant.category: ProductCategory` — a variant belongs to exactly one category (a sildenafil tablet is ED; a tirzepatide pen is weight-loss — no variant is both).
- `Ingredient` extended with weight-loss values (tirzepatide, semaglutide) alongside the existing sildenafil/tadalafil.
- `Provider` stays category-agnostic itself (a single pharmacy can legitimately dispense both ED and weight-loss products) — category lives on the variant/offer side, not the provider.
- Existing seed/demo data migrates to `category = ERECTILE_DYSFUNCTION` so nothing currently built breaks.

### Discovery & pricing engine (reframes M3b/M4-M5 priority — see those files)

This was already the largest remaining build item; the pivot makes it explicitly *the* priority over content depth, since it's the one piece that doesn't get rebuilt per brand. Discovery adapters and price/discount scraping adapters need to record which category each catalogue entry belongs to, but the adapter interface, scheduling, freshness rules and validation guardrails are unchanged — they were never ED-specific to begin with.

### Content & theme (reframes M2/M6 — see those files)

The ED navigation, taxonomy and copy already built (six menu groups, 50 routes, the ED-specific guides/side-effects taxonomy in `06-content-trust-seo.md`) stays exactly as-is — it becomes **the ED deployment's** content, not deleted or generalized away. What's needed going forward is a brand/category config layer so the same layout components, nav shell, comparison UI and trust-page templates can be re-skinned and re-populated for a weight-loss deployment without copy-pasting the app. `docs/milestones/02-layout-theme-foundation.md` line 23 currently states "there are no weight-loss or unrelated medicine routes" as a scope boundary — that line is now the thing being deliberately lifted, not a permanent constraint.

## Compliance implication — this is why the pivot touches M1, not just schema

The two ED-specific product categories named by the client have **materially different legal exposure**, so "the compliance framework" can't be one blanket answer across verticals. See the rewritten `01-scope-and-compliance.md` for the full framework; summary:

- **ED**: sildenafil 50mg ships as a **P (pharmacy) medicine** (Viagra Connect) — genuinely OTC, publicly priceable/rankable under ordinary medicine-ad rules. Everything else ED-side (other strengths, tadalafil, branded routes) is POM and stays restricted.
- **Weight-loss**: tirzepatide (Mounjaro) and semaglutide (Wegovy/Ozempic) have **no P-medicine tier in the UK** — every weight-loss GLP-1 product is prescription-only, full stop. There is no "safe to show priced/ranked" bucket for this vertical the way there is for ED; every weight-loss pricing page starts in the conditional/noindex tier.

This means a weight-loss deployment cannot simply reuse the ED deployment's "P-medicine pages go live immediately" path — it has no equivalent path until a real legal review clears POM price display specifically.

## Relationship to the rest of the milestone set

`01`–`10` are not being rewritten wholesale. The roadmap document (`monj-functionality-and-ed-milestones.md`) and the ED-specific content taxonomy in `06-content-trust-seo.md` remain valid as **the ED vertical's** design record. This file is the layer above them recording that the product is now the engine, ED is vertical #1, and weight-loss is vertical #2 built on the same core once it's generalized.
