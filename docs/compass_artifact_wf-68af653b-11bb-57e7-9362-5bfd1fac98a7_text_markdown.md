# Implementation-Ready Plan: Automated Discovery & Maintenance of a UK Online Pharmacy Provider Database (September 2026)

## TL;DR
- **Build a multi-source registry ingestion + web-verification pipeline, not a single-source import.** The authoritative "spine" is the GPhC pharmacy register (its published Registered Premises List is "correct as of 30 June 2026" and updated every three months; the GPhC Registers page reports "Pharmacies – 13,311") joined to Companies House (legal entity/ownership) and CQC (online-doctor/prescribing arm). None of these datasets contain a website field, so the domain must be *discovered* and *verified* independently via search APIs + Common Crawl + on-page GPhC-number matching.
- **Full automation is achievable for the majority of matches but not 100%.** The consumer-brand → prescribing-clinic → dispensing-pharmacy split means a brand like "Numan" is legally several registered entities; a confidence-scored matcher can auto-approve strong evidence (GPhC number on-page, company-number match) and must route the rest to human review, backed by a manual-submission and periodic-audit fallback.
- **Monthly running cost is low: roughly £45–£100/month including hosting**, dominated by SERP API calls and infra; Companies House, NHSBSA, NHS ODS, CQC and Common Crawl data access are all free. The GPhC Data Subscription Service (£400–£600/yr) is **optional and only marginally worth it** for the daily/weekly change feed.

## Key Findings

### The single most important structural fact
No UK authoritative pharmacy dataset publishes the consumer website/domain. This was verified across all four candidate sources:
- **GPhC** Registered Premises List (XLSX) and Data Subscription Service — **no website field**.
- **NHSBSA** Consolidated Pharmaceutical List — **no website field**; it does not even carry the trading name (that lives in a separate Contractor Details dataset).
- **NHSBSA** Pharmacy Openings and Closures — aggregate counts only, **no premises rows at all**.
- **NHS ODS ORD API** — the Contacts array *schema* supports a `www` contact type, but for community pharmacies it is almost always empty (verified live: record FR877 "Hursley Road Pharmacy" returned only a `tel` contact).

Therefore website discovery is an irreducible, separate engineering problem — the core of this system.

### The regulatory signal that changed in 2025
The GPhC **Internet Pharmacy Logo scheme closed to new applications in June 2025 and has been fully discontinued.** The GPhC "Pharmacy premises registration" page states verbatim: "The scheme closed to new applications in June 2025 and has now been discontinued... as of 31 December 2025 we have disabled this from our online register." The classic "click the EU/GPhC common logo to verify" signal is therefore **dead** for new sites. However, GPhC's "Guidance for registered pharmacies providing pharmacy services at a distance" (February 2025) still **requires** online pharmacies to display their **GPhC registration number** on the website, now with a link to the GPhC online register. That on-page registration number becomes the single strongest verification signal.

### The three-entity modelling problem is real and regulator-confirmed
A men's-health brand typically decomposes into distinct registered entities:
- **Consumer brand / legal company** (Companies House) — e.g. the marketing website operator.
- **Prescribing service** — regulated by **CQC** in England if it employs a "listed" professional (doctor/nurse); notably, a service using **only pharmacist prescribers can fall outside CQC scope** (a documented loophole), so CQC coverage of online providers is incomplete.
- **Dispensing pharmacy premises** (GPhC) — sometimes a third-party/sister company (e.g. LloydsPharmacy Online Doctor's prescribing arm is registered under "Expert Health Limited"; The Independent Pharmacy states its prescribing is carried out by sister company "Red Label Medical Ltd").

The schema must model these as separate entities with typed relationships, or ownership/rebrand/closure logic will produce false positives.

---

## Details: Source-by-Source Assessment

### 1. GPhC (General Pharmaceutical Council) — the authoritative pharmacy spine
- **Free published data:**
  - *Registered Premises List* — an XLSX updated **quarterly** (the current file is "correct as of 30 June 2026"), downloadable from the Registers page. Fields: premises registration number (7-digit, starts with 1), pharmacy name, owner/legal entity, address lines, town, county, postcode, registration status, superintendent pharmacist. **No website.**
  - *Register search* (web) — live lookup by name/number/postcode; the underlying data is refreshed daily (the page shows a "data last updated" timestamp, e.g. 08/09/2026).
  - *Monthly register data reports* — aggregate counts/trends only.
- **Paid Data Subscription Service:** RESTful HTTP GET service behind an authorisation code; **XML or CSV**; **register extracts updated daily, change lists compiled weekly**; provides additions, removals and **suspensions** — the key change-detection feed. Restricted to organisations for permitted purposes (validating registration status / public-safety research); **marketing use is expressly prohibited** by the licence. **Pricing (per the GPhC Data Subscription Service licence): "Annual subscription to the full GPhC data subscription service is £600.00. Annual subscription to the data on registered pharmacy premises only is £400.00. Payment is by invoice only."** The order form/licence has been refreshed to a March 2026 version but the pricing is unchanged. **No website field even in the paid product.**
- **Usefulness:** Essential as the identity backbone (GPhC number is the universal join key and the strongest on-page verification token). The quarterly free file is adequate for the initial load and slow-changing premises; the paid feed only adds a faster (daily/weekly) change stream.
- **Cost-vs-benefit recommendation:** **Do not buy at MVP.** The free quarterly XLSX plus scraping the register-search timestamp covers the vast majority of needs; the population changes by only a few hundred premises a quarter. Revisit the £400 premises-only tier once you need same-week detection of suspensions/removals (a genuine data-quality signal for delisting providers). The £600 tier adds the professionals register, which this project does not need.

### 2. NHSBSA Open Data Portal
- **Consolidated Pharmaceutical List (CPL):** England-only NHS community pharmacies + appliance contractors + LPS contractors. **Quarterly** (validated on a quarterly basis because "high volumes of changes take place each month"), CSV, **Open Government Licence v3.0**, via **CKAN 3.0 Action API** (`opendata.nhsbsa.net` — `package_search`, `package_show`, `datastore_search`). Fields: contractor code (= **ODS/F-code**), contractor (legal) name, address, postcode, dispensing/contractor type, **distance-selling flag**, 100-hour flag, Health & Wellbeing Board, LPC. **No website.** Reference tooling: `github.com/nhsbsa-data-analytics/open-data-portal-api`.
- **Pharmacy Openings and Closures:** monthly, but **aggregate counts by group size** (Small 1–5, Medium 6–99, Large 100+) plus 100-hour and distance-selling counts — **not** a per-premises open/close feed.
- **Usefulness:** The **distance-selling (DSP) flag is the single most valuable free signal for online-pharmacy identification** — Distance Selling Premises are contractually barred from face-to-face dispensing, so they are structurally "online/mail-order" NHS pharmacies. Also supplies the ODS code that bridges to NHS ODS. Free, so include it.

### 3. NHS Organisation Data Service (ODS) — ORD API & FHIR API
- **ORD API** (full record): `https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations/{ODScode}` — JSON (XML with `?_format=xml`), **open access, no auth, no onboarding**. Conforms to DCB0090. Pharmacies carry role **RO182**. Returns name, dated status (open/close dates), address+UPRN, roles, and **relationships (Rels)** including **succession/predecessor links** (mergers/reconfigurations). A **"last change date" query lets you pull organisations modified since a date** — a free change-detection mechanism. Contacts *can* include `www` but almost never do for pharmacies (schema supports email/website/telephone/fax; live pharmacy records typically carry a phone number at most).
- **FHIR API** (STU3, `directory.spineservices.nhs.uk/STU3/Organization/{code}`): reduced dataset, open access.
- **Usefulness:** Free authoritative source of **open/close dates, status, UPRN geolocation, and HQ/parent relationships** for NHS-contracted pharmacies. Best used to enrich and cross-check GPhC/NHSBSA records and to detect closures. Does not help find websites.

### 4. CQC (Care Quality Commission) — the online-doctor/prescribing layer
- **Syndication API:** base `https://api.cqc.org.uk/public/v1`, JSON over HTTPS. Requires a `partnerCode` query param (self-chosen if not a formal partner). Per the CQC Syndication API portal: "Clients including a partnerCode in requests may make up to 2000 requests per minute. Higher request rates, or requests without a partnerCode may be subject to throttling." Data updated **daily**. Requires TLS 1.2+.
- **Crucially, CQC provider records DO contain a `website` field** (verified in the API schema/examples, e.g. the provider example includes `"website": "www.royalwolverhamptonhospitals.nhs.uk"`). This makes CQC the **only authoritative source that sometimes hands you the domain directly.**
- **Change/ownership handling:** a **`/changes/` service** lets you poll provider/location changes over a date range (feed your previous `endTime` as the next `startTime`). Re-registration produces a **new ID plus an `HSCA Predecessor` relationship** to the old one, and from 1 April 2019 ratings/reports are inherited — so ownership/address changes are explicitly traceable.
- **Usefulness:** High for the **online-doctor/prescribing arm** of men's-health brands (ED/PE especially involve prescriber consultations). But coverage is **incomplete** — pharmacist-only prescribing services and offshore-doctor models legally escape CQC. Free. Include it as a primary source for the "provider brand" entity and as a website seed.

### 5. Companies House — legal entity, ownership & real-time change events
- **Public Data API** (REST, free API key, **600 requests/5 min**, elevated on request at no cost): company profile (status, type, incorporation date, SIC codes, registered office), officers, PSCs, filing history. **Advanced Search** endpoint (`/advanced-search/companies`) filters by **SIC code** (use **47730 "Dispensing chemist in specialised stores"**) + location + incorporation date + status — the closest thing to "find all pharmacy companies." (Note: the free-text name param is `company_name_includes`, not `company_name`.)
- **Streaming API** (`stream.companieshouse.gov.uk`, free key): long-lived HTTP push of **real-time register change events** (`/companies`, `/filings`, `/officers`, `/persons-with-significant-control`) — ideal for detecting incorporations, name changes, dissolutions the same day. Must handle 429 back-off.
- **Bulk monthly CSV snapshot** (free "companies bulk data product", ~monthly, ~500 MB, ~5M rows): basic company data for initial load / SIC filtering without hammering the API. PSC bulk (JSON) updated daily.
- **Website field:** **No.** Companies House holds no registered website field. Officer/PSC data helps corroborate ownership and rebrands, not domains.
- **Usefulness:** Essential for the **legal_entity** node, ownership graph, rebrand/closure detection, and SIC-47730 discovery of *newly incorporated* pharmacy companies before they appear in slower registers.

### 6. Search-engine & bulk web discovery
- **Bing Web Search API: retired 11 August 2025.** Microsoft's lifecycle notice states: "Any existing instances of Bing Search APIs will be decommissioned completely, and the product will no longer be available for usage or new customer signup." Legacy keys now return HTTP 410. The replacement is an Azure AI-agent grounding product, not a SERP API — **do not build on Bing.**
- **Google Programmable Search / Custom Search JSON API:** 100 free queries/day, then **$5 per 1,000, capped 10,000/day**; Google has signalled the Custom Search JSON API is being wound down (reported end ~January 2027), so treat as legacy.
- **Practical SERP choice (2026):** third-party Google SERP APIs. **Serper.dev** offers prepaid packs from $50 (50,000 credits) to $3,750, working out to roughly **$1.00 down to $0.30 per 1,000 queries**, with **2,500 free queries** for new accounts and credits valid 6 months (note: 11–100 results per query costs 2 credits, doubling the effective rate). DataForSEO is ~$0.60/1,000 (queued); SerpApi is $9–$25/1,000 (premium, with a U.S. legal indemnity). For hundreds–low-thousands of lookups/month, Serper or DataForSEO cost pennies.
- **Common Crawl:** free corpus on S3. The **URL Index (columnar/Parquet)** is queryable with **AWS Athena at ~$5/TiB scanned** (a whole monthly index ≈300 GB, an upper bound of about **$1.50 per query as of September 2025**, usually less). Lets you bulk-find candidate domains by TLD/host pattern and, via WAT/WET files, **search page text for GPhC numbers or treatment terms across the entire .uk web without crawling it yourself.** Excellent for bulk discovery/backfill; the live web fetch is still needed for freshness and verification.

### 7. Pharmacy directories
- **NHS website "Find a pharmacy" / Directory of Healthcare Services (Service Search) API** (`digital.nhs.uk` service-search) — application-restricted but free; returns NHS pharmacy profiles. **NHS Profile Manager / Service Finder** are login-gated (NHS.net Connect, MFA required from Oct 2025) and **not usable as an open feed.** The NHS website pharmacy profile *can* include a website link entered by the contractor, so the Service Search API is a **secondary website seed** worth trying.
- Commercial directories (chemist directories, review sites) are **low-trust** and a major false-positive source (see Risks).

### 8. Affiliate networks as a live-website confirmation signal
- **Awin, Impact, Partnerize, Rakuten** publish **advertiser/brand directories**; a men's-health brand listed with an active affiliate programme *implies a live, consumer-facing, transactional website.* Awin's public advertiser directory is browsable; deeper data (product feeds, deep-link/tracking domains) requires being an approved **publisher** on the network (free to join as a content publisher).
- **Usefulness:** A strong *secondary* signal that a discovered domain is a genuine commercial online provider (not a high-street info page), and a discovery source for D2C brands (Hims, Numan, Manual, Sons, etc.) that may not surface cleanly from registries. Not authoritative for identity — a brand's affiliate domain must still be tied back to a GPhC/CQC entity.

---

## A. Recommended Authoritative Source Hierarchy (conflict-resolution priority)

1. **GPhC pharmacy register** — supreme authority for *"is this a legally registered pharmacy and what is its status?"* (registered/suspended/removed). The GPhC number is the master identity key.
2. **CQC** — authority for the *online-doctor/prescribing service* entity, its registered legal name, ownership/predecessor changes, and (sometimes) its website.
3. **Companies House** — authority for the *legal entity*, ownership (PSC/officers), incorporation/dissolution, rebrands (previous names), and SIC classification.
4. **NHS ODS (ORD)** — authority for NHS open/close dates, UPRN geolocation, HQ/parent relationships for NHS-contracted pharmacies.
5. **NHSBSA CPL** — authority for NHS contract type and the **distance-selling flag**.
6. **NHS website Service Search / affiliate networks / Common Crawl** — corroboration and website seeds only.
7. **Commercial directories / review sites** — lowest trust; never authoritative, used only as weak hints.

Rule of thumb: **status conflicts** → trust GPhC; **legal-name/ownership conflicts** → trust Companies House; **website conflicts** → trust the domain carrying a matching on-page GPhC number, then CQC's website field.

## B. Refined End-to-End Discovery Architecture

The proposed pipeline is sound; I add feedback loops, a Common Crawl bulk lane, and an explicit entity-resolution stage before candidate generation:

```
[Scheduled ingestion]
  GPhC XLSX (Q)  ─┐
  NHSBSA CPL (Q) ─┤
  NHS ODS (chg)  ─┼─► RAW REGISTRY RECORDS (append-only, hashed)
  CQC (daily)    ─┤
  CH stream/bulk ─┘
        │
        ▼
  NORMALIZATION (address/postcode canonicalization, company-number & GPhC-number extraction, name cleaning)
        │
        ▼
  ENTITY RESOLUTION  ◄──── deterministic keys (GPhC no., ODS code, company no., UPRN) then fuzzy (name+postcode)
        │            ─► builds/updates legal_entity, pharmacy_premises, provider nodes + relationships
        ▼
  CHANGE DETECTION (diff vs last snapshot per source: new / removed / suspended / address / owner / renamed)
        │  emits provider_status_event + provider_discovery_event
        ▼
  PROVIDER CANDIDATES (entities plausibly running a consumer online service: DSP-flagged, CQC online-doctor, SIC-47730 new co., affiliate-listed)
        │
        ▼
  WEBSITE DISCOVERY  ◄──── CQC website field → SERP API queries → Common Crawl URL/host index → affiliate directory
        │  emits website_candidate rows
        ▼
  WEBSITE VERIFICATION (fetch page + footer/contact/about; extract GPhC no., company no., postcode, schema.org Org, address)
        │
        ▼
  TREATMENT / ONLINE-SERVICE DETECTION (consultation-flow, structured data, treatment pages: ED / hair loss / PE)
        │
        ▼
  CONFIDENCE SCORING (weighted signals)  ─► ≥ auto-approve ─► PROVIDER DATABASE (published)
        │                                  └─ mid ─► ADMIN REVIEW QUEUE ─► (approve/reject feeds back as rules/training)
        └─ below reject threshold ─► discard/park
```

Key improvements over the original: (1) an **append-only raw layer** so every diff is reproducible and change events are provable; (2) **entity resolution before candidate generation** so the three-entity split is modelled correctly; (3) a **Common Crawl bulk lane** for cheap backfill and periodic re-sweeps; (4) **human decisions feed back** into the matcher's rules/allow-block lists.

## C. Recommended Database Schema

Model legal entity, dispensing premises, consumer brand, website and service as **separate tables** with explicit relationships (PostgreSQL/Supabase).

- **legal_entity** — `id`, `company_number` (CH, unique), `legal_name`, `status` (active/dissolved/liquidation), `incorporation_date`, `dissolution_date`, `registered_office`, `sic_codes[]`, `previous_names[]`, source watermark. *One row per Companies House company.*
- **pharmacy_premises** — `id`, `gphc_number` (unique), `ods_code` (nullable), `premises_name`, `owner_legal_entity_id` → legal_entity, `address`, `postcode`, `uprn`, `registration_status` (registered/suspended/removed), `distance_selling` (bool, from NHSBSA), `superintendent`, `first_seen`, `last_confirmed`. *One row per GPhC-registered premises.*
- **provider** — the **consumer-facing brand** (e.g. "Numan"). `id`, `brand_name`, `primary_legal_entity_id`, `cqc_provider_id` (nullable), `cqc_predecessor_id` (nullable), `status` (active/dormant/closed), `is_online` (bool), `confidence`, `review_state`. *The unit the comparison platform actually lists.*
- **provider_pharmacy_relationship** — `provider_id`, `pharmacy_premises_id`, `role` (dispenses_for / prescribes_for / same_entity), `evidence`, `valid_from`, `valid_to`. *Many-to-many: models brand→clinic→dispenser chains and franchise groups sharing one site.*
- **provider_website** — `id`, `provider_id`, `domain`, `url`, `is_primary`, `first_seen`, `last_checked`, `http_status`, `verification_confidence`, `verification_signals` (JSONB). *A provider can have several domains; a domain maps to exactly one provider.*
- **provider_service** — `id`, `provider_id`, `category` (enum: erectile_dysfunction / hair_loss / premature_ejaculation / other), `detected` (bool), `detection_method`, `evidence_url`, `first_seen`, `last_seen`, `active` (bool). *Enables "started/stopped offering ED" events.*
- **registry_record** (raw, append-only) — `id`, `source` (gphc/nhsbsa/ods/cqc/ch), `source_pk`, `payload` (JSONB), `content_hash`, `fetched_at`. *Immutable evidence + diff basis.*
- **provider_discovery_event** — `id`, `provider_id` (nullable until resolved), `event_type` (candidate_found/website_found/verified/etc.), `source`, `detail` (JSONB), `created_at`.
- **provider_status_event** — `id`, `entity_type`, `entity_id`, `event_type` (new/removed/suspended/address_changed/owner_changed/renamed/website_changed/service_added/service_removed), `old_value`, `new_value`, `source`, `detected_at`.
- **website_candidate** — `id`, `provider_id` (nullable), `candidate_url`, `discovery_method` (serp/commoncrawl/cqc/affiliate), `raw_signals` (JSONB), `score`, `disposition` (promoted/rejected/pending).

This cleanly separates: **legal_entity** (Companies House) / **pharmacy_premises** (GPhC dispensing site) / **provider** (consumer brand) / **provider_website** (domain) / **provider_service** (ED/hair-loss/PE), with `provider_pharmacy_relationship` capturing the multi-entity chain.

## D. Website Matching Algorithm & Confidence Scoring

**Candidate generation (per provider/premises):**
1. Use CQC `website` field if present (seed).
2. SERP API queries: `"{legal_name}"`, `"{brand_name} pharmacy"`, `"{gphc_number}"`, `"{premises_name} {postcode}"`. Collect top domains.
3. Common Crawl URL index: hosts whose homepage/WAT text contains the GPhC number or legal name.
4. Affiliate advertiser directories: brand-name match → advertiser domain.

**Signal extraction (fetch homepage + /about + /contact + footer):** GPhC registration number on page; Companies House number on page; registered-office/premises postcode; legal company name; brand name; schema.org `Organization`/`Pharmacy`/`MedicalOrganization` (incl. `sameAs`); a link back to the GPhC online register; RDAP/WHOIS (see caveat).

**Weighted scoring (points; tune on the review-queue outcomes):**

| Signal | Weight | Rationale |
|---|---|---|
| Exact **GPhC registration number** found on-site (matches candidate) | **+55 (very strong)** | Now the definitive signal post-logo-scheme; number is legally required on page |
| **Companies House number** on-site matches candidate legal_entity | **+45 (very strong)** | Hard identifier, rarely spoofed |
| On-page link resolves to the provider's GPhC register entry | +25 | Corroborates the number |
| **Registered/premises postcode** exact match on-site | +20 (strong) | Address legally required on distance-selling sites |
| **Legal company name** exact match (footer/T&Cs) | +18 (strong) | Legal name rarely on lookalikes |
| schema.org Organization with matching name/sameAs | +12 | Structured, harder to fake accidentally |
| CQC website field pointed here | +15 | Authoritative seed |
| Affiliate network lists this domain for the brand | +8 | Confirms live commercial site |
| Brand/trading-name match only (no hard ID) | +6 (weak) | Necessary but insufficient |
| Domain contains brand tokens | +3 (weak) | Weak prior |
| **Negative:** page is a comparison/review/directory site | **−40** | Prevents listing aggregators as the pharmacy |
| **Negative:** GPhC number present but belongs to a *different* provider | −50 | Detects shared-platform/white-label confusion |
| **Negative:** site displays "not recommended"/no reg number & sells POMs | −20 | Likely illegitimate |

**Thresholds:**
- **Auto-approve:** score **≥ 70** *and* at least one "very strong" hard identifier (GPhC or CH number) present. (E.g. GPhC number 55 + postcode 20 = 75.)
- **Human review:** **35–69**, or ≥70 achieved *only* from soft signals (name + brand + directory) with no hard identifier.
- **Reject/park:** **< 35**.

**WHOIS/RDAP caveat:** For `.uk`/`.co.uk`, Nominet has retired public WHOIS. Its Registrar Resources page states: "The .uk WHOIS is now end of life, it will be phased out over the next year. Registrars offering a WHOIS query service from their website should utilise RDAP. Nominet provides an RDAP client for end users at https://rdap.nominet.uk/". Registrant name/address are shown only where the registrant has explicitly consented (individuals redacted by default). So WHOIS/RDAP is an **unreliable identity signal for .uk** — use it only opportunistically (creation date, registrar), never as a core weight.

## E. Identifying Genuine Online Providers & ED/Hair-Loss/PE Categories (beyond keywords)

**Is it a genuine ONLINE provider (vs. a high-street info page)?** Score on structural/flow signals, not keywords:
- **Distance-selling flag** in NHSBSA CPL (structural, authoritative) → strong "online" prior.
- **CQC "online doctor/remote prescribing" regulated activity** registration → strong.
- **Consultation-flow detection:** presence of a multi-step online questionnaire/consultation funnel (form endpoints, "start consultation", account creation before purchase), a **basket/checkout** on prescription items, and **delivery/subscription** options — detected via page-structure/DOM and form analysis, not word matching.
- **Regulatory footer block:** GPhC number + named superintendent + prescriber GMC/GPhC numbers + physical dispensing address (mandated by Feb 2025 GPhC distance-selling guidance) → confirms a real regulated online pharmacy rather than an unregulated storefront.
- **schema.org** `MedicalWebPage`/`MedicalBusiness`/`Pharmacy`/`Offer` structured data.
- **Affiliate-programme presence** → confirms transactional consumer site.

**Category detection (ED / hair loss / PE)** — combine, don't rely on one:
- **Treatment/drug entity matching** rather than raw keywords: map on-page drug names to categories — ED: sildenafil/tadalafil/Viagra/Cialis/Spedra/vardenafil; hair loss: finasteride/Propecia/minoxidil/Regaine/dutasteride; PE: dapoxetine/Priligy/Fortacin/EMLA/lidocaine-prilocaine. Presence of a **product/consultation page for these drugs with a price and a "start consultation" CTA** = active service.
- **URL/route + navigation taxonomy:** dedicated `/erectile-dysfunction`, `/hair-loss`, `/premature-ejaculation` (or a "men's health" hub) category pages with sub-pages per treatment.
- **schema.org `Drug`/`Offer`/`MedicalWebPage.about`** entities where present.
- **State over time:** a `provider_service.active` flag re-checked on schedule detects **service added** (new ED page appears) and **service removed** (page 404s / removed from nav).

This layered approach avoids false positives from, e.g., a blog article merely *mentioning* Viagra. Note that all major men's-health brands (Boots Online Doctor, Superdrug Online Doctor, LloydsPharmacy Online Doctor, Numan, Manual, Hims, Sons, Zava) cluster tightly on ED and hair loss; PE coverage is thinner and a good discriminator of a fuller-service provider.

## F. Synchronization Schedule (source → cadence → change scenario)

- **Real-time / continuous:** Companies House **Streaming API** → new incorporations (SIC 47730), **company name changes (renamed)**, dissolutions (closure), PSC/officer changes (**owner changed**).
- **Daily:** CQC `/changes/` poll → new online-doctor registrations, **ownership/address re-registrations (HSCA Predecessor)**, deregistrations; SERP re-check of a rolling subset of unverified/low-confidence candidates; re-fetch websites flagged "changed" (HTTP diff).
- **Weekly:** Re-crawl all *active provider* websites → **website changed**, **new online service launched**, **service added/removed** (ED/hair-loss/PE page diff); NHS ODS "modified since" pull → open/close/status; optional GPhC Data Subscription weekly change list (if purchased) → suspensions/removals.
- **Monthly:** Companies House **bulk snapshot** reconciliation (catch anything the stream missed); Common Crawl new-index sweep for newly appearing pharmacy domains / GPhC numbers; affiliate directory diff for new brands.
- **Quarterly:** Full re-import of **GPhC Registered Premises List** and **NHSBSA CPL** → authoritative reconciliation of the whole population (**new entry / removed entry / suspended / address changed**), plus a full re-verification pass and a **manual audit sample**.

**Change-scenario → detector map:**

| Scenario | Primary detector |
|---|---|
| New registry entry | GPhC quarterly diff; CH stream (SIC 47730); CQC daily |
| Removed entry | GPhC quarterly diff; NHS ODS close date; CH dissolution stream |
| Suspended pharmacy | GPhC register status (paid weekly feed fastest) |
| Address changed | NHS ODS / GPhC / CH registered office diff |
| Owner changed | CH PSC/officer stream; CQC predecessor |
| Business renamed | CH name-change stream; CQC predecessor; GPhC name diff |
| Website changed | Weekly site re-fetch (content hash) |
| New online service launched | Weekly site crawl; DSP-flag appearance; CQC new registration |
| Existing pharmacy starts ED/hair-loss | Weekly `provider_service` page diff |
| Provider stops a service | Weekly `provider_service` re-check (404 / nav removal) |

## G. Automatable vs. Human-Review

**Fully automatable:** all registry ingestion and diffing; entity resolution on hard keys (GPhC/ODS/company numbers, UPRN); change-event emission; website candidate generation; on-page GPhC/company-number/postcode extraction; auto-approval of ≥70-with-hard-identifier matches; service/treatment page detection; scheduled re-verification.

**Needs human review:** (1) **fuzzy identity ties** with no hard identifier (name+postcode only); (2) the **brand↔prescriber↔dispenser mapping** when a brand uses a third-party/white-label pharmacy (e.g. a shared platform serving many brands from one GPhC premises); (3) **rebrands vs. new entrants** where CH previous-names is ambiguous; (4) **borderline "is it really online"** cases; (5) anything scoring 35–69. Rationale: these are exactly the cases where the multi-entity legal structure and lookalike/aggregator risks produce costly false positives, and a wrong auto-listing is a compliance/liability issue for a health price-comparison site.

## H. Estimated Monthly Cost (itemized)

| Item | Cost |
|---|---|
| GPhC free quarterly premises XLSX + register-search scrape | £0 |
| GPhC Data Subscription Service (**optional**, premises-only £400/yr) | £0 at MVP (≈ **£33/mo** if later purchased; ≈ £50/mo for the £600 full tier) |
| NHSBSA CPL (CKAN API/CSV) | £0 |
| NHS ODS ORD/FHIR API | £0 |
| CQC Syndication API | £0 |
| Companies House Public Data + Streaming + bulk | £0 |
| SERP API (Serper.dev ~$1/1,000; ~5–20k lookups/mo incl. re-checks) | ~**$5–$40/mo** (≈ £4–£32) |
| Common Crawl via AWS Athena (~$5/TiB; a few sweeps, ≤~$1.50/full-index query) | ~**$5–$20/mo** (≈ £4–£16) |
| Supabase/Postgres + background workers hosting | ~£20–£40/mo (infra, not data) |
| Affiliate network access | £0 (free publisher signup) |
| **Total data/API spend at MVP** | **≈ £10–£50/mo** (≈ **£45–£100/mo** including hosting; +£33/mo if GPhC premises feed added) |

Costs stay low because every authoritative source is free; the only metered spend is SERP + Common Crawl, both cheap at this scale.

## I. Biggest Risks & False-Positive Scenarios

1. **Comparison/review/aggregator sites mistaken for the pharmacy** (e.g. "best online pharmacy" listicles, or *this very platform's* competitors). Mitigation: strong negative weight; require a hard on-page identifier; maintain a block-list of known aggregator domains.
2. **Franchise/group pharmacies sharing one website** across many GPhC premises (Boots, LloydsPharmacy, Well) — one domain legitimately maps to hundreds of premises but **one provider brand**. Mitigation: `provider_pharmacy_relationship` many-to-many; deduplicate domains to the brand, not the premises.
3. **White-label / shared platforms** (one dispensing pharmacy powering many consumer brands). A single GPhC number appearing on many brand sites is *expected*, not a match error. Mitigation: model the dispenser→provider relationship explicitly; a GPhC number shared across sites triggers review, not auto-merge.
4. **Rebrands** (name change at CH but same entity) creating duplicate providers. Mitigation: CH previous-names + PSC continuity + CQC predecessor links.
5. **Similarly-named unrelated pharmacies** ("Manor Pharmacy" in different towns). Mitigation: postcode + company-number disambiguation; never match on name alone.
6. **Defunct GPhC records still online** (suspended/removed pharmacy whose site is live, or a live site whose registration lapsed). Mitigation: status is authoritative from GPhC; flag "website live but registration removed" for urgent review (potential illegal seller — cross-check the MHRA "not recommended" list at `report-or-check-suspicious-activity.mhra.gov.uk`).
7. **Affiliate/marketing microsites** and offshore sites masquerading as UK-regulated. Mitigation: require UK GPhC number tie-back; MHRA "not recommended" check.
8. **The pharmacist-only CQC loophole & offshore doctors** → genuine online providers invisible to CQC. Mitigation: don't treat CQC absence as disqualifying; rely on GPhC + on-page signals.

## J. First Implementation Milestone (this week's MVP)

Scope a **single vertical slice** proving the pipeline end-to-end:
1. **Ingest** the GPhC Registered Premises List (quarterly XLSX) + NHSBSA CPL (CKAN API) into `registry_record` and resolve to `pharmacy_premises`/`legal_entity` (join CPL distance-selling flag by ODS code; join Companies House by owner name → company number via Advanced Search SIC 47730).
2. **Seed a candidate set of ~30–50 known online men's-health providers** (Boots Online Doctor, Superdrug Online Doctor, LloydsPharmacy Online Doctor, Numan, Manual, Hims, Sons, Zava, The Independent Pharmacy, Pharmica, etc.) and run **website discovery** (Serper API) + **verification** (fetch homepage/footer, extract GPhC number + postcode + company number) + **confidence scoring**.
3. **Detect ED/hair-loss/PE** via the treatment-drug + category-page method and populate `provider_service`.
4. **Build the admin review queue** (Next.js/Supabase) showing each candidate's signals, score, and auto-approve/review/reject disposition, with approve/reject buttons that write back.
5. Deliverable: a populated `provider` + `provider_website` + `provider_service` table for the seed set, with a visible confidence score and a working review UI. This validates the hardest parts (verification + scoring + multi-entity linking) before scaling ingestion.

## K. Worked Example (realistic, illustrative)

**Registry record (raw):** GPhC premises register row — *Name: "Vitality Dispensing Ltd", GPhC: 9012345, Address: 5 Mill St, Manchester, M1 2AB, Status: Registered, Owner: Vitality Dispensing Ltd.* NHSBSA CPL shows the same ODS contractor flagged **Distance Selling = Yes**. Companies House Advanced Search (SIC 47730, "Vitality Dispensing") → company **12345678**, active, incorporated 2023, PSC "J. Smith".

1. **Normalization/entity resolution:** creates `legal_entity`(12345678), `pharmacy_premises`(GPhC 9012345, DSP=true) owned by it. DSP flag → strong "online" prior → promoted to **provider candidate**.
2. **Website discovery:** SERP queries `"9012345"`, `"Vitality Dispensing pharmacy"`, `"Vitality men's health Manchester"` → top candidate `manvitality.co.uk` (a consumer brand). Common Crawl confirms `manvitality.co.uk` homepage text contains "9012345". Affiliate check: brand listed on Awin → live commercial site.
3. **Regulatory matching (fetch site):** footer shows "GPhC registered pharmacy 9012345", company number 12345678, address "5 Mill St, Manchester M1 2AB", superintendent named; schema.org `Pharmacy` present.
   - Scoring: GPhC number +55, company number +45, postcode +20, legal-name +18, schema.org +12, affiliate +8 — well above 70, with **two hard identifiers** present.
4. **Online-service detection:** multi-step "Start your consultation" funnel + basket on POM items + next-day delivery → **genuine online provider**.
5. **ED/hair-loss detection:** `/erectile-dysfunction` page lists sildenafil/tadalafil with price + consultation CTA (→ `provider_service` ED active); `/hair-loss` lists finasteride/minoxidil (→ hair loss active); no PE page (PE inactive).
6. **Confidence → action:** ≥70 with hard identifiers → **auto-approved.** System creates `provider`("Man Vitality"), `provider_website`(manvitality.co.uk, verified), `provider_pharmacy_relationship`(provider↔premises, role=same_entity/dispenses_for), and `provider_service` rows for ED + hair loss. A `provider_discovery_event` and `provider_status_event`("new") are logged. Weekly crawl thereafter watches for a PE page appearing (service_added) or ED page disappearing (service_removed).

## Recommendations (staged)

1. **Weeks 1–2 (MVP):** Build the Section J slice — free sources only, Serper free tier (2,500 queries), seed provider set, review UI. **Do not buy the GPhC subscription yet.** Benchmark: can you auto-approve ≥60% of the seed set with hard identifiers and zero false auto-approvals?
2. **Weeks 3–6 (scale ingestion):** Add Companies House streaming + CQC daily changes + NHS ODS; wire the full change-event schedule; add Common Crawl backfill. Benchmark: detect a real suspension/closure within one cycle.
3. **Month 2+ (harden):** Add affiliate-network publisher access; tune weights from review-queue outcomes; add the MHRA "not recommended" cross-check. **Threshold to buy the GPhC premises-only feed (£400/yr):** when quarterly latency on suspensions/removals is demonstrably causing stale listings (e.g. a delisted pharmacy stays live > 4 weeks).
4. **Ongoing:** quarterly manual audit sample (≥50 providers) to measure precision/recall; maintain aggregator/white-label block- and allow-lists; keep a **public manual-submission form** and a "report an error" link as the crowd-sourced fallback for coverage gaps.

## Caveats & Coverage Gaps (be realistic)

- **100% automated discovery of every UK online men's-health provider is not achievable.** Hard gaps: (a) providers invisible to CQC via the **pharmacist-only prescribing loophole** and offshore-doctor models; (b) brand→white-label-dispenser chains where the public site never names the dispensing GPhC premises clearly; (c) **brand-new** entrants between registry refreshes; (d) sites that display the GPhC number only as an image (defeats text matching) — needs an OCR fallback; (e) `.uk` WHOIS/RDAP redaction removes registrant confirmation.
- **Best practical fallback:** the confidence-tiered human-review queue + a **public "submit your pharmacy / report a listing" form** + **quarterly manual audits** + MHRA-list cross-checks. This converts the unautomatable tail into a bounded, low-volume manual workload rather than a silent coverage hole.
- **Legal/licensing:** the GPhC Data Subscription licence **prohibits marketing use** and restricts data to permitted purposes (registration validation / public-safety research) — a price-comparison platform must confirm its intended use qualifies before purchasing. NHSBSA/CH/CQC data are OGL/open and reusable with attribution. Common Crawl and SERP scraping carry their own ToS/robots and (for some SERP vendors) legal risk — prefer indemnified providers if scaling aggressively.
- Some field-level specifics (exact GPhC XLSX / NHSBSA CPL header strings) were compiled from official documentation and FOI releases rather than read off the raw files; verify column headers against the live CKAN datastore preview (`opendata.nhsbsa.net/api/3/action/datastore_search`) at implementation time.