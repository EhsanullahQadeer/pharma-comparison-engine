# Review of the supplied pharmacy-discovery research

Reviewed: 14 September 2026. This note reconciles the supplied research with the [main Monj/ED plan](monj-functionality-and-ed-milestones.md). It is a targeted review of discovery and implementation assumptions, not a verification of every named pharmacy, price, affiliate programme or vendor quote.

## Documents reviewed

- [Provider discovery and maintenance research](compass_artifact_wf-68af653b-11bb-57e7-9362-5bfd1fac98a7_text_markdown.md): registry sources, website discovery, identity matching, change monitoring and proposed scoring.
- [Medicine price-engine research](compass_artifact_wf-530f7ac2-25c1-54ad-8429-f49c58cfd92c_text_markdown.md): provider candidates, price adapters, fee normalisation and refresh tiers.

Both contribute useful design material. Their detailed numbers and technical claims are research inputs rather than confirmed requirements. Neither provides authorised live credentials, an already-verified provider database or permission to collect every provider's prices.

## What we should adopt

1. Combine several sources instead of expecting one complete list of online ED providers.
2. Model consumer brand, legal operator, prescribing service, dispensing premises and website separately, with dated relationships.
3. Discover a website separately when a source lacks it; use provided website fields as leads when available.
4. Match identifiers and addresses, retain supporting evidence and route uncertainty to a review queue.
5. Separate discovering a registered premises from establishing an active online ED service and collecting an exact product price.
6. Use provider-specific adapters and the same review/publication flow for both automated and manual observations.
7. Monitor source changes, preserve previous verified values and keep manual correction/submission routes.

## Verified additions and corrections

| Research claim or proposal | Finding and decision |
| --- | --- |
| No authoritative source supplies website fields | Too broad and internally contradicted by the discovery report's CQC section. CQC says its downloadable locations data includes website links. Use these as candidate domains, with identity checks. [CQC source](https://www.cqc.org.uk/about-us/transparency/using-cqc-data) |
| CPL has no trading name and provides a distance-selling flag | The current 2026/27 Q1 resource dictionary explicitly lists `PHARMACY_TRADING_NAME`; it does not list a distance-selling field. Do not implement from the report's assumed headers. [Current CPL dictionary](https://opendata.nhsbsa.net/dataset/consolidated-pharmaceutical-list/resource/ce6c7ad3-a3b5-442f-bb0a-a45d7c962944) |
| Distance selling is a useful candidate signal | Retain the idea, but locate it in NHSBSA Contractor Details and verify the actual release schema. Government guidance specifically identifies this dataset for DSP identification. It does not establish an ED service. [Official guidance](https://www.gov.uk/government/publications/pharmaceutical-needs-assessments-information-pack/pharmaceutical-needs-assessments-information-pack-for-local-authority-health-and-wellbeing-boards) |
| NHSBSA covers the full pharmacy market | CPL covers England NHS pharmacies, appliance contractors and LPS contractors; it is quarterly. It is not a UK private-online-provider catalogue. [CPL scope](https://opendata.nhsbsa.net/dataset/consolidated-pharmaceutical-list) |
| Monthly Pharmacy Openings and Closures is a premises change feed | NHSBSA describes it as counts of pharmacies. Do not use aggregate changes to add/remove named providers. The first research document already recognises this distinction; the second's ingestion proposal needs that qualification. [NHSBSA dataset overview](https://www.nhsbsa.nhs.uk/access-our-data-products/open-data-portal-odp) |
| Build new ODS access on ORD or STU3 | NHS England now directs new users to Organisation Data Terminology FHIR R4. STU3 is retired; ORD has a September 2027 retirement timeline dependent on feedback. [API selection](https://digital.nhs.uk/services/organisation-data-service/organisation-data-service-apis/choosing-an-organisation-data-service-api) |
| A simple changed-since date is sufficient | ODS warns about delayed updates and distinguishes record-change date from effective date. Use overlap/deduplication and preserve the earlier cursor during delayed-source recovery. [ODS change guidance](https://www.odsdatasearchandexport.nhs.uk/referenceDataCatalogue/LastChangeDate_636505291.html) |
| Companies House SIC searches discover candidates | Supported: the API exposes SIC, name, incorporation-date and status filters. Require an API key; retain other discovery routes for brands and businesses that do not fit the filter. [Search specification](https://developer-specs.company-information.service.gov.uk/companies-house-public-data-api/reference/search/advanced-company-search) |
| Use the same key for Companies House REST and streaming | The streaming documentation says the keys are not interchangeable. Streaming also needs reconnection/checkpoint handling; start with bounded pilot queries unless continuous events justify it. [Authentication](https://developer-specs.company-information.service.gov.uk/streaming-api/guides/authentication), [stream overview](https://developer-specs.company-information.service.gov.uk/streaming-api/guides/overview) |
| Common Crawl URL index finds arbitrary registration numbers inside pages | The URL index identifies archived URLs; page-body searches require retrieving/processing suitable archive content or a separately built text index. Do not equate a cheap index query with a complete text search of the corpus. [URL index](https://index.commoncrawl.org/), [archive formats and access](https://commoncrawl.org/get-started) |

The Contractor Details endpoint timed out during this review; the source's role is supported by official government guidance, but its live field names are not asserted here. The GPhC registers page returned 403, so the reports' exact free spreadsheet, quarterly-file headers and snapshot counts remain to be checked before import. This is separate from the subscription agreement previously reviewed in the main plan.

## Proposals we should qualify rather than copy

| Proposal | Decision for this project |
| --- | --- |
| Auto-approve a website at 70 points using an on-page registration number and postcode | Use scores only for review priority initially. These details can be copied together; the score is neither independent evidence nor a calibrated probability. First publication requires a verified relationship to the legitimate business. |
| GPhC number is a universal join key for every source | It identifies a premises in its own register. ODS codes, company numbers and clinic IDs identify other entities. Store crosswalk evidence; name/postcode matching is a candidate relationship, not an automatic identity merge. |
| Any GPhC number on a page verifies a pharmacy | Distinguish premises IDs from individual professional IDs. Do not import the supplied provider table's badges/numbers without checking the referenced record type and current dispensing relationship. |
| Company dissolution, NHS closure or CQC archival means the pharmacy has closed | Investigate each change in its own scope. A consumer brand can change operator or dispensing partner; an NHS contract can end independently of private services. Do not collapse these events into one universal closure status. |
| No CQC record means an unlawful provider, or one record proves the whole service | Assess the applicable activity and jurisdiction. Keep clinic evidence separate from dispensing registration; do not use “loophole” as a product label or infer authorisation from a single badge. |
| Wait until a deregistered listing remains live for weeks before buying faster verification | Reject this trigger. Set an acceptable verification age and resource it before publication. Free-source manual checks can support a small pilot; the paid feed is an access/scale choice, subject to licence, rather than a remedy after known stale safety claims. |
| Snapshot everything forever | Preserve reproducibility only within source rights, retention rules and necessary storage scope. Append-only history does not override a licence requiring deletion. |
| Most providers are cheap/easy to automate | Treat the named providers as integration hypotheses. Confirm permitted access, exact variants, fee visibility and stability in the three-provider trial before estimating automation percentage. |
| Commission exclusion proves product absence from the feed | These are different questions. Separately verify data access, price completeness, permitted display and commission eligibility for the exact product/service and programme. Do not generalise from one programme to all ED providers. |
| £45–£100/month is the running cost | Treat it as an unvalidated limited infrastructure estimate. It does not establish total cost including staff, clinical/editorial review, adapter repair, source rights and ongoing support. Keep the main plan's workload-based budget. |
| Hard providers can have weekly prices in a daily comparison | Weekly verification is acceptable for a labelled historical/indicative view, but cannot satisfy this project's 24-hour current-price rule. Keep stale offers out of current rankings. |
| Add hair-loss and PE products alongside ED immediately | Preserve the requested ED scope. Those categories remain optional future expansion, with separate content and product review. |

The price report's provider table contains explicit duplicate entries and an unspecified “Hims UK / other men's brands” row. It is not 30 independently verified distinct providers. Deduplicate by verified trading website and entity relationships, and onboard exact named services individually. No current price, commission rate, regulator badge or extraction permission is inferred from inclusion in that table.

## Combined implementation sequence

These steps refine M1/M3/M4 of the main plan; they do not authorise building or importing data in this documentation task.

1. **Create the source register.** For each dataset, record its publisher, jurisdiction, licence/permitted use, effective date, publication time, access method and real headers. Keep confidential/subscription data out of unrestricted exports.
2. **Create candidate records.** Start with a small deduplicated subset of the supplied provider list, public provider submissions, CPL candidates and Companies House search. Apply no affiliate filter.
3. **Add NHS enrichment.** Join compatible CPL and Contractor Details records through ODS codes; use FHIR R4 for relevant organisation dates and relationships. Do not assume the premises subscription exposes ODS codes.
4. **Establish identity and domain.** Use independently sourced website links where available, permitted search, and provider evidence. Resolve brand/operator/prescriber/dispenser relationships before first approval. A blog mentioning sildenafil does not establish an active ED service.
5. **Verify registration in the correct jurisdiction.** Keep GPhC and PSNI coverage distinct and assess any applicable clinic regulator. Record source age and unresolved conflicts.
6. **Approve and attach a price adapter.** Verify the exact ED variant, fees and supply conditions. A provider without obtainable exact prices can remain informational rather than falsely current.
7. **Schedule changes.** Weekly candidate discovery and dataset-release checks; daily ODS/CQC changes once integrated; per-offer price intervals from the main plan. Add Companies House streaming or Common Crawl only when their incremental coverage justifies the work.
8. **Measure the pilot.** Track verified unique providers, unresolved domain matches, rejected lookalikes/duplicates, source age, exact-price coverage and staff minutes per provider. Do not claim 60% automation or complete market coverage before measurement.

## Implementation checks still required

- Retrieve the exact free GPhC baseline and its reuse terms, or choose another permitted baseline/validation route.
- Inspect the current Contractor Details file, its distance-selling field and join quality.
- Confirm the current CQC developer-portal API contract and credentials; do not hardcode legacy `partnerCode` examples from the research.
- Confirm FHIR R4 access requirements and the exact filtering/pagination contract before coding.
- Verify each selected provider's identity, ED service, source permissions, variants and fee breakdown.
- Obtain commercial confirmation of programme eligibility before counting affiliate revenue.

This preserves the research's useful multi-source architecture while removing unsupported promises about complete coverage, automatic approval, very low total cost and universal price-feed availability.
