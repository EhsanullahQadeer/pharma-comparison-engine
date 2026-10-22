# M8 — Quality Checks, Pilot & Launch

**Status:** 🟨 In progress (2026-10-22) — regression suite + CI, backup/restore drill and keyboard/phone walkthrough done; waiting on the client (approvals, contacts, runbook [to agree] items, review budget), the worker on the VPS (fresh prices) and a database password change
**Depends on:** M1–M7 (affiliate revenue from M7 is optional, not blocking)
**Roadmap:** [monj-functionality-and-ed-milestones.md § Milestone 8](../monj-functionality-and-ed-milestones.md#milestone-8--quality-checks-pilot-and-launch)

## What we're building

The release gate: a defined test pass, a working pilot with real (or real-shaped) data, and a trained operating team — not a new feature.

## How we're building it

- Regression suite covering: pricing edge cases (M5), failed-import handling (M4), staff permission boundaries (M3a), accessibility, and backup/restore.
- Mobile and keyboard-only journey walkthrough on the actual comparison flow (M2 → M5), not just desktop mouse use.
- Backup/restore drill against the real Postgres instance — verified, not assumed to work.
- Staff runbook: how to correct a listing, suspend a provider, and handle an out-of-hours price-error report (roadmap §2.11, §4.7).
- Content/privacy approvals and incident contacts recorded as actual documents, not left implicit in someone's head.

## Alternatives considered

| Approach | Trade-off |
| --- | --- |
| Custom — internal team tests calculations, imports, access controls, accessibility and restoration | Efficient ongoing ownership; independent review still valuable |
| Third party — contract QA, accessibility and security specialists for launch assessment | Independent findings; external scheduling and cost |
| **Hybrid (recommended by roadmap)** — internal regression checks plus targeted independent review | Balanced coverage; scope external work to the actual risk |

## Checklist

- [ ] Full regression suite passing (pricing, imports, permissions, accessibility) — **partial (2026-09-29):** `npm test` runs every unit test (112), including the new permission-boundary test `src/actions/server-action-auth.test.ts` (every `"use server"` export must reach `requireStaffRole`/`getStaffUser` or be on a reasoned public allowlist; it found and we fixed two unguarded internal helpers, `collectPriceForMatch` → `collect-price.ts`, `createProviderRecord` → `create-provider-record.ts`). `npm run test:a11y` (`scripts/a11y-scan.ts`, axe WCAG 2.0–2.2 A/AA, 58 routes × light/dark) passes with 0 violations after fixing header/CTA contrast, muted-grey and red tokens, citation target size and task-list checkboxes. §4.7 pricing scenarios now covered (`src/lib/failure-scenarios.test.ts`, 2026-10-22, 265 tests). CI added 2026-10-22: `.github/workflows/checks.yml` runs type-check, lint, `npm test` and a `bash -n` parse of `deploy/*.sh` on every push to main and every pull request (no database or secrets). Remaining: `test:a11y` still needs a running site, so run it by hand before each deploy
- [x] Backup/restore drill completed successfully (2026-10-22) — logged in `docs/backup-restore.md`: a fresh dump of the live Supabase database restored into a throwaway Postgres 18 server, 24 tables, every row count matched. The drill found two real faults, both fixed: the backup dumped Supabase's own schemas/extensions (`supabase_vault`), which can't be restored onto plain Postgres — `db-backup.sh` now dumps the `public` schema only, and the drill drops the new database's empty `public` schema first; and the live `DATABASE_URL` has an unencoded `@` in its password, which the app tolerates but `pg_dump` rejects — the server's `.env` must encode it (`%40`) or the nightly backup fails. Still to do on the server: install the cron job and the off-server copy
- [x] Mobile + keyboard-only journey verified end to end (2026-10-22, against the dev server; prices a week old but listed) — 27 checks: skip link, Filters panel open/close with focus returned, sort by column, price link (focus ring, Enter opens the pharmacy), pharmacy profile; at 390px no sideways scroll on 7 pages, menu, compact rows, swipe columns, Filters panel. Found and fixed: (1) re-sorting dropped keyboard focus to the page, so the next Tab skipped the whole table (WCAG 2.4.3) — new `src/components/common/keep-focus.tsx` puts focus back on the sort link; (2) on a phone the Filters panel's Apply/Reset sat below the screen (y=1130 on 844) — only the choices scroll now, the buttons stay in view. Repeat once prices are fresh, with a real screen reader if possible
- [x] Staff runbook written (correct listing, suspend provider, out-of-hours error report) (2026-09-29) — `docs/staff-runbook.md`; **[to agree]** items: daily check cadence, reply policy, on-call rule
- [ ] Content/privacy approvals recorded — register created (`docs/launch-approvals.md`, 9 sign-offs, all Needed); needs the approvals themselves
- [ ] Incident/escalation contacts recorded — table at the end of `docs/staff-runbook.md`, waiting for names
- [ ] No known critical defects open — open (2026-10-22): prices ~7 days old until the worker runs on the VPS; database now on Supabase — enable its network restrictions (app/worker hosts only); **change the database password** (part of it appeared in an AI-assistant session log during the drill, and the new one should be URL-encoded in `DATABASE_URL`); sample testimonials; Companies House key
- [ ] Independent review scoped and completed (if the hybrid route is confirmed)

## Open questions

- Independent reviewer(s) for the launch pass — internal-only, or is there budget for external QA/accessibility/security review?
