# Delivery Milestones

Working breakdown of the [main roadmap](../monj-functionality-and-ed-milestones.md) into one file per milestone. Each file states **what** is being built, **how**, the **alternatives** considered (custom / third-party / hybrid, per the roadmap's own tables), and a live **checklist** of done vs remaining work. Update the checklist in place as work lands — don't duplicate status into a separate summary.

Roadmap milestones M3 and M4/M5 have been split by build concern rather than kept as single files, because "provider directory" (data model + admin UI) and "price collection + comparison calculation" are separably built and tested. The roadmap's dependency order still applies; each file states its own dependency explicitly.

Status legend: ⬜ Not started · 🟨 In progress · 🟩 Mostly complete · ✅ Done

| # | Milestone | Status | File |
| --- | --- | --- | --- |
| M1 | Scope, compliance & data-source feasibility | 🟨 | [01-scope-and-compliance.md](01-scope-and-compliance.md) |
| M2 | Layout, routes/pages, content & theme | 🟨 | [02-layout-theme-foundation.md](02-layout-theme-foundation.md) |
| M3a | Admin dashboard, auth & data model | ⬜ | [03-admin-dashboard-data-model.md](03-admin-dashboard-data-model.md) |
| M3b | Pharmacy listing — manual & automatic | ⬜ | [04-pharmacy-listing.md](04-pharmacy-listing.md) |
| M4/M5 | Price comparison engine — collection & calculation | ⬜ | [05-price-comparison-engine.md](05-price-comparison-engine.md) |
| M6 | Educational content, trust & search discovery | ⬜ | [06-content-trust-seo.md](06-content-trust-seo.md) |
| M7 | External referrals, corrections & commercial reporting | ⬜ | [07-referrals-reporting.md](07-referrals-reporting.md) |
| M8 | Quality checks, pilot & launch | ⬜ | [08-qa-pilot-launch.md](08-qa-pilot-launch.md) |
| M9 | Optional: retention & useful tools | ⬜ | [09-retention-tools.md](09-retention-tools.md) |
| M10 | Optional: clinical-service expansion | ⬜ | [10-clinical-expansion.md](10-clinical-expansion.md) |

## Recent scope updates

- **2026-09-14:** Reviewed Monj's live navigation directly (Guides / Side Effects / Tools / Trust mega-menus, a sticky trust bar, and a cited-article template). This substantially expanded M6's content taxonomy (see that file for the full guides/side-effects breakdown, including a **Dangerous Interactions** category — nitrates, alpha-blockers, poppers — that has no Monj equivalent but is safety-critical for PDE5 inhibitors), added mega-menu nav + sticky trust bar to M2, and reclassified M9's "tools": static reference content (medicine comparison, onset/duration, dose-strength charts) moved to M5/M6 as core scope, leaving M9 with only genuinely optional or higher-risk items (accounts-gated features, a tracker app, and an explicitly deferred personalisation quiz).
- **2026-09-14, later same day:** Corrected the first pass above — it had mostly relabelled Monj's own column names rather than thinking from the ED patient journey. Rebuilt M6's Guides taxonomy around three genuinely ED-specific categories with no Monj equivalent (**Understanding ED** — causes, cardiovascular link, prevalence; **Beyond Medication** — non-drug treatment options; **Talking About It** — stigma, partner communication), added a **Cardiovascular Safety Before Starting** side-effects category distinct from drug interactions, and added two ED-specific tools (IIEF-5 self-assessment explainer, cardiovascular pre-screening checklist) reclassified as core M6 scope in `09-retention-tools.md` — contrasted explicitly against the personalisation quiz that stays out of scope.

## How to use these files

- Check a box the moment the work is actually done and verified (typechecked/tested/deployed), not when it's started.
- If a decision in "Open questions" gets answered, fold the answer into "How we're building it" and delete the question — don't let answered questions pile up.
- If reality diverges from the roadmap (a source turns out to be unusable, a milestone gets reordered), update this file's table and the milestone file's "Depends on" line — the roadmap document itself stays as the historical record of the original plan; these files are the living build tracker.
- New milestone-shaped work that doesn't fit an existing file should get a new numbered file and a new row here, not be squeezed into an unrelated file.
