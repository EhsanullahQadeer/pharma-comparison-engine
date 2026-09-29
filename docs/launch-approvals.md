# Launch approvals register

Milestone 8 needs content and privacy approvals recorded as documents, not left implicit. Each
row is a sign-off the business must obtain before public launch. Fill in who approved it, when,
and where the evidence is kept (email, signed PDF, ticket). An approval with no evidence link
does not count.

Status: **Needed** · **Requested** · **Approved** · **Not needed** (with the reason).

| # | What needs approving | Why | Approver (role) | Status | Approved by / date | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Privacy policy (`/ed/privacy`) | Must match what the site actually collects (form fields, click counts, no analytics cookies) and name the data controller | Solicitor / data protection lead | Needed | | |
| 2 | Company legal name and registered address as data controller | Missing from the privacy policy | Company director | Needed | | |
| 3 | Terms of use (`/ed/terms`) | Liability wording for a price comparison of medicines | Solicitor | Needed | | |
| 4 | Showing prices for prescription-only medicines | Pharmacy and prescription-price pages are kept out of search engines until a solicitor has reviewed third-party POM price display; this sign-off lifts that block | Solicitor (medicines advertising) | Needed | | |
| 5 | Clinical review of all 23 guide, side-effect and tool articles | Health content is published as "sourced, clinical review pending" until a clinician signs it off | Registered pharmacist or doctor | Needed | | |
| 6 | Use of GPhC register data | Licence terms for re-using register data are unresolved; the client accepted the risk for development only | Solicitor / GPhC | Needed | | |
| 7 | Homepage testimonials | Current quotes are labelled samples; replace with real quotes given with permission, or remove | Marketing owner | Needed | | |
| 8 | Affiliate programme terms (per programme, only if any go live) | Each network's terms must allow comparison of prescription ED medicines | Commercial manager + solicitor | Not needed until a programme is activated | | |
| 9 | Independent QA / accessibility / security review | Decide internal-only or budgeted external review (milestone 8 open question) | Business owner | Needed (decision) | | |

## Related launch items that are not approvals

These are tracked in `docs/current-tasks.md`; listed here so the launch decision sees them.

- Price collection running on the server (without it, every price disappears after 48 hours).
- Backup/restore drill passed and recorded in `docs/backup-restore.md`.
- Escalation contacts filled in at the end of `docs/staff-runbook.md`.
- Database access restricted to the web and worker servers (the database address is publicly reachable today).
- Companies House API key re-entered.
