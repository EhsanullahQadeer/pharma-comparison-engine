# M8 — Quality Checks, Pilot & Launch

**Status:** 🟨 In progress (2026-09-29) — tests, accessibility scan, runbook, backup scripts and approvals register built; waiting on the VPS (worker, backup drill), the client (approvals, contacts, review budget) and M5/M6
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

- [ ] Full regression suite passing (pricing, imports, permissions, accessibility) — **partial (2026-09-29):** `npm test` runs every unit test (112), including the new permission-boundary test `src/actions/server-action-auth.test.ts` (every `"use server"` export must reach `requireStaffRole`/`getStaffUser` or be on a reasoned public allowlist; it found and we fixed two unguarded internal helpers, `collectPriceForMatch` → `collect-price.ts`, `createProviderRecord` → `create-provider-record.ts`). `npm run test:a11y` (`scripts/a11y-scan.ts`, axe WCAG 2.0–2.2 A/AA, 58 routes × light/dark) passes with 0 violations after fixing header/CTA contrast, muted-grey and red tokens, citation target size and task-list checkboxes. Remaining: §4.7 pricing scenarios (M5), no CI yet (run both before each deploy)
- [ ] Backup/restore drill completed successfully — scripts and procedure ready (`deploy/db-backup.sh`, `deploy/db-restore-drill.sh`, `docs/backup-restore.md`); needs running on the VPS and logging in the drill table
- [ ] Mobile + keyboard-only journey verified end to end — blocked until prices are fresh (worker running on the VPS)
- [x] Staff runbook written (correct listing, suspend provider, out-of-hours error report) (2026-09-29) — `docs/staff-runbook.md`; **[to agree]** items: daily check cadence, reply policy, on-call rule
- [ ] Content/privacy approvals recorded — register created (`docs/launch-approvals.md`, 9 sign-offs, all Needed); needs the approvals themselves
- [ ] Incident/escalation contacts recorded — table at the end of `docs/staff-runbook.md`, waiting for names
- [ ] No known critical defects open — open: public prices empty until the worker runs on the VPS; Postgres reachable at a public IP (restrict to the app/worker hosts); sample testimonials; Companies House key
- [ ] Independent review scoped and completed (if the hybrid route is confirmed)

## Open questions

- Independent reviewer(s) for the launch pass — internal-only, or is there budget for external QA/accessibility/security review?
