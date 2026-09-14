# M3b — Pharmacy Listing: Manual & Automatic

**Status:** ⬜ Not started
**Depends on:** M3a (schema must exist first)
**Roadmap:** [monj-functionality-and-ed-milestones.md § Milestone 3](../monj-functionality-and-ed-milestones.md#milestone-3--provider-directory-catalogue-and-staff-editing), [§4.1–4.2](../monj-functionality-and-ed-milestones.md#41-where-do-we-get-uk-pharmacy-listings)

## What we're building

The actual provider directory — getting real (or realistic pilot) pharmacies into the `Provider` table through two parallel routes:

1. **Manual** — a staff form to enter a provider by hand from verified public evidence.
2. **Automatic** — discovery jobs that pull candidate providers from official UK data sources into a review queue that promotes candidates to verified/published providers.

Per the roadmap, this explicitly does **not** mean auto-publishing scraped data — every first-time provider requires human approval (§4.2, step 3–4).

## How we're building it

- **Manual entry** — a Zod-validated Server Action form in the admin dashboard (M3a) that writes directly to `Provider` + `Evidence` with `status = discovered`; staff promote it through the state machine below.
- **State machine** (roadmap §4.2): `discovered → identity verified → ED catalogue verified → published → temporarily withheld / archived`. Modelled as a `status` enum on `Provider`; every transition is a deliberate staff action, never automatic for a first-time provider.
- **Automatic discovery**, in the priority order the roadmap gives (§4.1):
  1. NHSBSA Consolidated Pharmaceutical List + Contractor Details (quarterly, OGL) — candidate identity + distance-selling signal (check the flag in *Contractor Details*, not CPL — see `pharmacy-discovery-research-review.md`).
  2. NHS ODS FHIR R4 — organisation IDs/status. STU3 is retired; don't build against it.
  3. CQC API — linked clinic entities where relevant; its downloadable data includes website links usable as candidate domains.
  4. Companies House advanced search — SIC-code candidate discovery (needs an API key; REST and streaming keys are *not* interchangeable).
  5. GPhC premises data — registration validation. Confirm the subscription licence actually permits our intended use before paying (roadmap notes a £400/yr premises-only tier as one dated example, not a quote for us).
  6. Provider websites / a public "suggest a provider" form — the main route to the actual ED offering, pricing and service details.
- Each source becomes its own adapter module (e.g. `src/lib/discovery/nhsbsa.ts`, `src/lib/discovery/cqc.ts`) behind a shared interface, so adding a source doesn't touch review-queue logic.
- A weekly discovery job (cadence per roadmap §4.5) populates the review queue; nothing auto-publishes.
- **Identity resolution** — store legal entity, trading brand, website domain, clinic and dispensing premises as separate linked records rather than one flat row: one pharmacy can dispense for multiple brands, and a copied registration number or badge does not by itself prove website ownership.

## Alternatives considered

| Approach | Trade-off |
| --- | --- |
| Custom — build catalogue records, permissions, staff forms in-app | Best validation/audit control; higher effort |
| Third party — structured CMS/database as the editorial backend | Faster staff tooling; relational integrity and exports need review |
| **Hybrid (recommended by roadmap)** — own the database, import staff-managed spreadsheets or CMS content through validation | Easy initial operations; mapping must be maintained |

## Checklist

- [ ] Manual provider-entry form (staff-facing)
- [ ] Provider status state machine implemented (`discovered → … → published/archived`)
- [ ] Public "suggest a provider" form
- [ ] NHSBSA CPL + Contractor Details adapter
- [ ] NHS ODS FHIR R4 adapter
- [ ] CQC API adapter
- [ ] Companies House search adapter
- [ ] GPhC data — licence/use confirmed before purchase, then adapter built if approved
- [ ] Weekly discovery job wired up (scheduling infra shared with M4 — see that file)
- [ ] Review-queue UI (staff approve/reject candidates)
- [ ] Pilot: 5–10 real providers taken through the full pipeline end to end (roadmap's M3 completion bar)
- [ ] Duplicate-chain / multi-brand identity resolution tested

## Open questions

- Confirm the GPhC subscription licence permits our intended use before spending the quoted amount (roadmap §4.1).
- Who owns the "suggest a provider" review queue day-to-day at launch — is that the same person as the catalogue editor?
