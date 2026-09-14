# M8 — Quality Checks, Pilot & Launch

**Status:** ⬜ Not started
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

- [ ] Full regression suite passing (pricing, imports, permissions, accessibility)
- [ ] Backup/restore drill completed successfully
- [ ] Mobile + keyboard-only journey verified end to end
- [ ] Staff runbook written (correct listing, suspend provider, out-of-hours error report)
- [ ] Content/privacy approvals recorded
- [ ] Incident/escalation contacts recorded
- [ ] No known critical defects open
- [ ] Independent review scoped and completed (if the hybrid route is confirmed)

## Open questions

- Independent reviewer(s) for the launch pass — internal-only, or is there budget for external QA/accessibility/security review?
