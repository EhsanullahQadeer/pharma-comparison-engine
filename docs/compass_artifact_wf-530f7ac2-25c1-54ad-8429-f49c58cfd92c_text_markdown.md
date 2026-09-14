# Implementation-Ready Plan: A UK Men's-Health Medicine Price-Comparison Platform (Daily Price Data Engine) — September 2026

## TL;DR
- **Build a hybrid engine, not a scraper farm.** The reliable path is: (1) discover providers from free/authoritative registers (Companies House SIC 47730 Advanced Search + Streaming API, GPhC quarterly premises list, NHSBSA CKAN datasets, CQC Syndication API, NHS ODS ORD API); (2) collect prices per-provider with adapter modules — mostly static-HTML/JSON-LD parsing for independents like Dr Fox and Pharmica, but human-in-the-loop verification for subscription/consultation-gated services like Numan, Boots and LloydsPharmacy; and (3) treat affiliate feeds (Awin) as a corroboration source, not a primary one, because prescription-only ED/hair-loss items are largely excluded from commissionable feeds.
- **Prices are messy and cannot be trusted from a single number.** True all-in cost = medicine + consultation/prescription fee + delivery − valid discount, and providers split these differently (Dr Fox adds "a small prescription fee based on the order value of each prescription" on top of medicine from 50p/tablet and £2.90 tracked delivery; Numan/Boots bundle everything into a subscription "from £X/month" with big first-order discounts). A price without its fee model, pack size/strength and first-vs-repeat context is meaningless, so every observation must be normalized to per-tablet and per-month.
- **Automate the easy ~60%, verify the rest.** Roughly half the priority providers expose prices on static or lightly-rendered pages that can be parsed cheaply and rechecked daily; the other half are subscription/checkout/consultation-gated and should be on a slower cadence with mandatory human verification and screenshot evidence. Do NOT assume scraping is always allowed — check robots.txt and ToS per provider and prefer manual verification or affiliate data where automation is contractually or technically risky.

## Key Findings

### Discovery sources are strong, free, and mostly API-accessible
- **Companies House** is the best early-warning system for *new* pharmacy businesses. The Advanced Search API (`https://api.company-information.service.gov.uk/advanced-search/companies`) supports a `sic_codes` filter; **SIC 47730 = "Dispensing chemist in specialised stores"**. Combine `sic_codes=47730` + `incorporated_from` + `company_status=active` to find newly incorporated pharmacies. The **Streaming API** (`https://stream.companieshouse.gov.uk/companies`) pushes real-time change events (envelope carries `event`, `resource_id`, `resource_kind`, `data`). Both are **free** with a free API key (register at `developer.company-information.service.gov.uk`; HTTP Basic auth, key as username, empty password). The official rate limit is verbatim: *"You can make up to 600 requests within a 5 minute period. If you exceed this limit, you will receive a 429 Too Many Requests HTTP status code for each request made within the rest of the 5 minute time frame."* A **free monthly bulk CSV snapshot** of all companies (with SIC codes) is at `download.companieshouse.gov.uk` (`BasicCompanyDataAsOneFile-YYYY-MM-01.zip`). Caveat: 47730 also catches non-dispensing "drug store" retail and some pharmacies file under other SIC codes, so it is a candidate generator, not proof of a registered pharmacy.
- **GPhC** publishes a **free quarterly Excel list of registered pharmacies** ("Registered-Premises-List-30-06-2026_0.xlsx"), updated every three months, "correct as of 30 June 2026." Per GPhC's own registers-data page, the register held **13,298 pharmacies** (alongside 67,334 pharmacists and 28,407 pharmacy technicians), and the public pharmacy-register search notes its data "was last updated: 08/09/2026." For change detection you need the **paid Data Subscription Service**, confirmed verbatim as **"All registers – annual subscription cost £600 · Registered pharmacy premises only – annual subscription cost £400,"** payment by invoice, requiring a signed Licence Agreement (contact `datasubscription@pharmacyregulation.org`). It is delivered as **XML or CSV via RESTful HTTP GET**, **updated daily with weekly change lists (additions, removals, suspensions)** — but is **organisations-only** and requires an authorisation code. This is the single most valuable paid feed for registration-status changes.
- **NHSBSA Open Data Portal** runs on **CKAN** with a full Action API (`https://opendata.nhsbsa.net`, example code at `github.com/nhsbsa-data-analytics/open-data-portal-api`). Relevant datasets: **Consolidated Pharmaceutical List** (quarterly, contains ODS F-codes) and **Pharmacy Openings and Closures** (monthly). Free, no auth.
- **CQC Syndication API** (`https://api.cqc.org.uk/public/v1`) is **updated daily**, JSON, under **Open Government Licence 3.0**, requires a `partnerCode` query param and (for newer access) a free developer-portal token from `api-portal.service.cqc.org.uk`; a **weekly CSV directory download** of all regulated locations is also published. CQC exposes re-registration relationships ("HSCA Predecessor"), useful for detecting ownership/renaming changes.
- **NHS ODS** exposes the **ORD API** (`https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations`) and a **FHIR R4 API**, open-access, no onboarding; pharmacy F-codes are refreshed weekly from NHSBSA. The `odsdatasearchandexport.nhs.uk` tool gives CSV exports.
- **MHRA distance-selling register**: this scheme was **discontinued in Great Britain from 1 January 2021** and now only covers Northern Ireland sellers, so it is *not* a useful discovery source for GB online pharmacies anymore — GPhC is now the authority for GB (per gov.uk guidance and the MHRA medicine-seller-register site).

### Pricing exposure varies sharply by provider "type"
Three archetypes emerged from live inspection:
1. **Independent pay-per-item pharmacies (easiest).** Dr Fox, Pharmica, Simple Online Pharmacy, Oxford Online Pharmacy, Medino, The Independent Pharmacy, Chemist4U publish prices in **server-rendered static HTML pricing tables** on stable product URLs (e.g., `doctorfox.co.uk/erectile-dysfunction/sildenafil.html`). Dr Fox states verbatim "Generic sildenafil is available at much lower cost, from 50p per tablet, while Viatris branded Viagra costs over £5 per tablet," "UK delivery only: £2.90 per consultation via Royal Mail Tracked 24," and "Dr Fox supplies medicine on prescription and charges a small prescription fee based on the order value of each prescription." Its Cialis page is titled "tadalafil from 40p per tablet" and notes supply is capped at "up to 32 tablets at one time." Pharmica shows sildenafil "from 99p" and advertises "no hidden fees." These are parseable with plain HTTP + HTML parsing, daily.
2. **Subscription men's-health brands (hard).** Numan, Manual, Boots Online Doctor, LloydsPharmacy Online Doctor present pricing as **"from £X/month"** with aggressive first-order discounts. Numan's public offer is "up to 60% off their first order" (subscriptions "starting from just £12 a month"), with an ED-specific "60% off your first erectile dysfunction order" (a specific "max £35" cap appears in Numan's own on-page copy but should be confirmed at checkout); Boots uses "SUBSAVE50" (50% off first order); ZAVA uses "START30/START40" (£30–£40 off). Real per-tablet cost is often only revealed after selecting a plan or partway through the consultation. First-order vs repeat pricing differs materially.
3. **Consultation/checkout-gated (hardest).** Some prices only appear after a clinical questionnaire or at checkout. These require browser automation or manual capture and are the strongest candidates for human verification.

### Affiliate feeds exist but largely exclude the target products
- **Awin runs the affiliate programs** for Dr Fox, Pharmica, Pharmacy2U and PharmacyOnline.co.uk, and offers a genuine **product data feed** ("Create-a-Feed"/Product Service): CSV or XML (or Google-Shopping "Enhanced" format), each feed has a unique refreshable URL, and fields include **price, shipping_cost, stock, category, deeplink** — so in principle it can supply prices without scraping.
- **BUT the commercially critical catch is confirmed verbatim** on Awin merchant profile 65: *"you WILL NOT earn any commission on private prescriptions, NHS repeat prescription orders, or Shop orders. Pharmacy2U Online Doctor Affiliate Programme Details: Commission - Default - 3%. Cookie - 30 days. AOV (2025) - £175."* Its Prescriptions programme adds that it "adhere[s] strictly to the MHRA Blue Guide... neither ourselves, nor any affiliate partner, can incentivise people." Pharmica pays up to 15%. Because ED and hair-loss treatments are **private prescription** items, they are frequently **excluded from commissionable feeds**, and MHRA Blue Guide advertising rules restrict promoting prescription-only medicines and any incentivisation. Net: affiliate feeds are a useful *corroboration and OTC-pricing* source, but cannot be the primary price source for prescription ED/hair-loss items.
- Impact, Partnerize and Rakuten Advertising all support product data feeds generically (Partnerize via Feedonomics, etc.), but no evidence any of the priority UK men's-health providers run their prescription pricing through them in a way that exposes POM prices.

## Details

### 1. Pharmacy discovery — concrete daily/weekly process
**Daily:**
- Poll **Companies House Streaming API** `/companies` continuously; filter events where SIC includes 47730 (or company name matches pharmacy/health keywords). Fall back to **Advanced Search** `sic_codes=47730&incorporated_from={yesterday}` as a backstop (the stream can drop events).
- Poll **CQC Syndication API** `changes` since last run (daily-updated) for new/updated locations whose provider type is a pharmacy/independent-doctor service; capture HSCA Predecessor links to catch renames/ownership changes.

**Weekly:**
- Pull the **CQC weekly CSV directory** and diff against last week.
- Refresh **NHS ODS** pharmacy F-codes (weekly BSA cadence) via the ORD API.
- Run a **branded Google/site search sweep** ("buy sildenafil online UK", "finasteride online pharmacy UK") to catch new consumer brands that register a company later than they launch marketing.

**Monthly/Quarterly:**
- Ingest **NHSBSA Pharmacy Openings and Closures** (monthly) and **Consolidated Pharmaceutical List** (quarterly) via CKAN.
- Ingest the **GPhC quarterly premises Excel**; if budget allows, subscribe to the **GPhC Data Subscription Service (£400 premises-only)** to get daily registration-status changes and weekly add/remove/suspend lists — the authoritative signal for "provider removed" or "registration suspended".

**Cross-reference logic:** a new consumer brand (from Google/marketing) → resolve to a legal entity (Companies House) → confirm it dispenses via a GPhC-registered premises (GPhC list) and/or an online-doctor arm regulated by CQC. Only providers confirmable against GPhC/CQC should be shown to consumers.

### 2–3. Collection approaches & automation feasibility
- **HTTP fetch + HTML parse:** viable and preferred for Dr Fox, Pharmica, Simple Online Pharmacy, Oxford Online Pharmacy, Medino, The Independent Pharmacy, Chemist4U, PharmacyOnline.co.uk. Low cost, daily cadence.
- **JSON-LD/schema.org:** partially available; schema.org has a `Pharmacy` type and many sites embed `Product`/`Offer` structured data. Parse it where present as the most stable signal, but do not rely on it universally — it is inconsistently populated on UK pharmacy product pages.
- **Hidden/public JSON APIs:** some Magento/Shopify-based stores expose product JSON endpoints; probe per provider.
- **Browser automation (Playwright):** reserve for JS-rendered or multi-step subscription selectors (Numan, Manual, Boots, LloydsPharmacy, ZAVA). Higher cost and fragility.
- **Sitemap monitoring & change-detection:** use sitemaps to detect new product/treatment pages; use content-diffing (e.g., a changedetection-style watcher) on pricing tables to trigger re-verification only when the page actually changes.
- **Affiliate feeds:** use Awin Create-a-Feed for OTC items and as a corroboration signal; expect POM ED/hair-loss items to be missing per the Pharmacy2U exclusion above.
- **robots.txt / ToS / anti-bot:** Must be checked per provider before automating. Large retail brands (Boots, Superdrug, LloydsPharmacy, Pharmacy2U) are more likely to deploy Cloudflare/bot management and to have ToS restricting automated access; independents are usually lighter. Note that robots.txt is only a voluntary signal and does not itself grant permission — the ToS governs. Where robots.txt disallows the pricing paths, or ToS forbids automated collection, or Cloudflare challenges block access, **switch that provider to affiliate-feed or manual verification** rather than fighting anti-bot. Never present scraping as universally appropriate.

### 4. Hybrid price-verification architecture
End-to-end data flow:
1. **Scheduler/queue** enqueues per-provider collection jobs by cadence tier.
2. **Provider adapter** runs the appropriate method and returns a **raw snapshot** (HTML/JSON + HTTP metadata + timestamp), stored immutably in object storage (Supabase Storage/S3).
3. **Parser** extracts candidate fields → a **normalized price observation** (provider, product, strength, pack size, unit price, fees, delivery, discount, first-vs-repeat).
4. **Confidence scoring**: high if structured data or a long-stable selector matched; low if layout shifted, fee model ambiguous, or value moved beyond an anomaly threshold (e.g., >20% change).
5. **Anomaly/change detection** diffs against the latest confirmed observation. Material change or low confidence → **screenshot/evidence capture** (Playwright full-page PNG) → **manual verification queue**.
6. **Human verifier** approves/edits; the approved record is written to an **append-only `price_history` table** and the current price view is refreshed.
7. Automatically-verified high-confidence unchanged prices bypass the human queue but still append to history with an "auto-verified" flag.

### 5. Price correctness — computing true all-in cost
Normalize every observation to a canonical formula:
`all_in = medicine_price + consultation_fee + prescription_fee + delivery_fee − valid_discount`
Then derive **per-tablet** and **per-month (28/30-day equivalent)** figures for comparability. Handle:
- **First-order vs repeat/subscription:** store both; label capped introductory discounts (e.g., Numan "up to 60% off first order") separately so the headline never misleads.
- **Quantity/strength variants:** treat every (product, strength, pack size) as a distinct SKU; bigger packs lower per-tablet but raise upfront cost — surface both.
- **Delivery variations:** encode free-delivery thresholds (e.g., Chemist4U free over £30) and express upcharges as conditional rules, not flat numbers.
- **Prescription fee models:** Dr Fox's fee scales with order value — model as a function, not a constant.
- **Expired discounts:** every discount carries validity metadata; expired codes are excluded from all-in and flagged.
- **Minimum-order / supply-cap requirements:** stored as constraints (e.g., Dr Fox tadalafil "up to 32 tablets at one time") that gate whether a price is achievable.

### 6. Freshness system
States: `checked_today` · `auto_verified` · `manually_verified` · `suspected_change` (anomaly pending human review) · `stale` (past its tier's max age) · `unavailable` (page/product missing) · `provider_removed` (GPhC/CQC deregistration).
Recheck tiers:
- **Tier A (daily):** high-traffic, price-volatile, easy-to-parse independents (Dr Fox, Pharmica, The Independent Pharmacy, Simple Online Pharmacy).
- **Tier B (2–3×/week):** stable independents and mid brands.
- **Tier C (weekly):** subscription/consultation-gated brands where automation is costly (Numan, Manual, Boots, LloydsPharmacy, ZAVA).
- **Tier D (event-driven):** anything flagged by sitemap/content-diff or by a registration-status change.

### 7. Affiliate/network data — verdict
Join **Awin** first (covers Dr Fox, Pharmica, Pharmacy2U, PharmacyOnline.co.uk) and pull Create-a-Feed product feeds for OTC/corroboration; treat prescription ED/hair-loss prices as scrape-or-verify because they are excluded from commission (confirmed for Pharmacy2U) and constrained by MHRA Blue Guide advertising rules. Evaluate Impact/Partnerize/Rakuten only if a specific priority provider is found to run there.

### 8. Technical implementation (Next.js + PostgreSQL/Supabase)
- **App:** Next.js (App Router) for the public comparison UI + an internal admin/verification console.
- **DB:** Supabase Postgres. New tables: `providers`, `products`, `provider_products` (SKU map), `raw_snapshots` (pointer to object storage), `price_observations`, `price_history` (append-only), `verification_queue`, `discounts`, `provider_status_events`.
- **Workers/cron:** a queue (e.g., pg-boss on Postgres, or Supabase cron + a worker service) dispatches per-tier jobs; lightweight HTTP-fetch workers for static sites; a separate **Playwright worker pool** (containerized) for JS/gated sites.
- **Retry/rate limiting:** exponential backoff, per-domain concurrency caps and polite crawl delays; jittered scheduling.
- **Proxies:** only where a provider blocks datacenter IPs — justified case-by-case, not by default; for most independents no proxy is needed.
- **Observability:** structured logs, per-adapter success-rate and parse-confidence metrics, and **alerting when a parser's confidence or match-rate drops** (parser-break detection).
- **Screenshots:** Playwright PNG to object storage, linked from each verification record as evidence.

### 9. Provider adapter design
A common interface every provider implements:
- `discover()` → list current product URLs (from sitemap/category pages).
- `fetch(url)` → raw snapshot + metadata (records collection method used).
- `parse(snapshot)` → array of candidate price observations with per-field confidence.
- `normalize(observation)` → canonical all-in / per-tablet / per-month.
- `capabilities` → declares method (static | jsonld | api | playwright | affiliate | manual), gating (none | consultation | checkout | login), and default cadence tier.
- `screenshot(url)` → evidence capture (optional).
Adapters are registered in a table so new providers are added as data + a small module, never by editing a monolith. A `manual` adapter type lets a human enter prices through the admin console using the identical schema.

### 10. Initial provider dataset (30+)

| # | Provider | Website | GPhC/CQC status | Treatments | Where price appears | Likely collection method | Automation difficulty | Affiliate | Refresh |
|---|---|---|---|---|---|---|---|---|---|
|1|Dr Fox|doctorfox.co.uk|GPhC + CQC regulated|ED, hair loss, +|Static HTML price tables|HTTP+HTML|Easy|Awin|Daily (A)|
|2|Pharmica|pharmica.co.uk|GPhC registered|ED, hair loss, weight|Static HTML "from" prices|HTTP+HTML|Easy|Awin (≤15%)|Daily (A)|
|3|The Independent Pharmacy|theindependentpharmacy.co.uk|GPhC + CQC|ED, hair loss, +|Per-item on consult flow|HTTP+HTML/Playwright|Medium|Unknown|Daily (A)|
|4|Simple Online Pharmacy|simpleonlinepharmacy.co.uk|GPhC|ED, hair loss, +|Static product pages|HTTP+HTML|Easy|Unknown|2–3×/wk (B)|
|5|Oxford Online Pharmacy|oxfordonlinepharmacy.co.uk|GPhC|ED, hair loss, +|Static + blog price tables|HTTP+HTML|Easy|Unknown|2–3×/wk (B)|
|6|Medino|medino.com|GPhC|ED, hair loss, +|Static product pages|HTTP+HTML|Easy|Unknown|2–3×/wk (B)|
|7|Chemist4U|chemist-4-u.com|GPhC 9012464|ED, hair loss, +|Product pages; free deliv >£30|HTTP+HTML|Easy–Medium|Unknown|2–3×/wk (B)|
|8|Numan|numan.com|CQC + GPhC (reg. 2221320)|ED, hair loss|Subscription "from £/mo"; consult|Playwright/manual|Hard|Unknown|Weekly (C)|
|9|Manual|manual.co|GPhC|ED, hair loss|Subscription plans|Playwright/manual|Hard|Unknown|Weekly (C)|
|10|Boots Online Doctor|onlinedoctor.boots.com|GPhC + CQC|ED, hair loss, +|Subscription + compare page|Playwright/manual|Hard (anti-bot likely)|Unknown|Weekly (C)|
|11|LloydsPharmacy Online Doctor|onlinedoctor.lloydspharmacy.com|GPhC + CQC|ED, hair loss, +|Subscription pages|Playwright/manual|Hard|Unknown|Weekly (C)|
|12|Superdrug Online Doctor|onlinedoctor.superdrug.com|GPhC + CQC|ED, hair loss, +|Product pages "from £"|HTTP+HTML/Playwright|Medium (anti-bot likely)|Unknown|2–3×/wk (B)|
|13|ZAVA UK|zavamed.com/uk|GPhC + CQC|ED, hair loss, +|Category "Prices from £"|HTTP+HTML/Playwright|Medium|Unknown|Weekly (C)|
|14|Asda Online Doctor (ZAVA)|onlinedoctor.asda.com|GPhC + CQC|ED, +|Same platform as ZAVA|Playwright/manual|Medium|Unknown|Weekly (C)|
|15|Pharmacy2U|pharmacy2u.co.uk|GPhC 9010146|ED, hair loss, +|Online-doctor pages|HTTP+HTML/affiliate|Medium|Awin (3% OD)|2–3×/wk (B)|
|16|Well Pharmacy|well.co.uk|GPhC|ED, +|Product pages|HTTP+HTML|Medium|Unknown|Weekly (C)|
|17|Click Pharmacy|clickpharmacy.co.uk|GPhC|ED, hair loss|Product pages|HTTP+HTML|Easy–Medium|Unknown|2–3×/wk (B)|
|18|Chemist Click|chemistclick.co.uk|GPhC|ED, hair loss|Product pages|HTTP+HTML|Easy–Medium|Unknown|2–3×/wk (B)|
|19|Treated.com|treated.com|GPhC + CQC|ED, hair loss, +|Product pages|HTTP+HTML/Playwright|Medium|Unknown|2–3×/wk (B)|
|20|UK Meds|ukmeds.co.uk|GPhC|ED, hair loss, +|Product pages + subscription|HTTP+HTML|Medium|Unknown|2–3×/wk (B)|
|21|Postmychemist|postmychemist.com|GPhC|ED, +|Product pages|HTTP+HTML|Medium|Unknown|Weekly (C)|
|22|Cloud Pharmacy|cloudpharmacy.co.uk|GPhC|ED, hair loss|Product pages|HTTP+HTML|Easy–Medium|Unknown|Weekly (C)|
|23|Care Chemist|carechemist.co.uk|GPhC|ED, +|Product pages|HTTP+HTML|Medium|Unknown|Weekly (C)|
|24|PharmacyOnline.co.uk|pharmacyonline.co.uk|GPhC|ED, hair loss, +|Product pages|HTTP+HTML/affiliate|Easy–Medium|Awin|2–3×/wk (B)|
|25|H2 Pharmacy|h2pharmacy.co.uk|GPhC|ED, +|Product pages|HTTP+HTML|Medium|Unknown|Weekly (C)|
|26|Chemist-4-U (retail arm)|chemist-4-u.com|GPhC 9012464|OTC + private|Product pages|HTTP+HTML|Easy–Medium|Unknown|2–3×/wk (B)|
|27|Hightown Pharmacy|hightownpharmacy.co.uk|GPhC|hair loss, ED|Static product pages ("from £10.99")|HTTP+HTML|Easy|Unknown|2–3×/wk (B)|
|28|Sons|sons.co.uk|GPhC partner|hair loss, ED|Subscription plans|Playwright/manual|Hard|Unknown|Weekly (C)|
|29|Manual (repeat/other categories)|manual.co|GPhC|ED, hair loss|Subscription|Playwright/manual|Hard|Unknown|Weekly (C)|
|30|Hims UK / other men's brands|—|varies|ED, hair loss|Subscription|Playwright/manual|Hard|Unknown|Weekly (C)|

(De-duplicate #26/#29 against #7/#9 in implementation; the row set intentionally covers every provider named in the brief plus corroborated additions.)

## Recommendations

### A. What to build first this week (MVP)
1. Stand up Supabase schema (`providers`, `provider_products`, `raw_snapshots`, `price_observations`, `price_history`, `verification_queue`).
2. Build **3 static adapters** (Dr Fox, Pharmica, The Independent Pharmacy) for sildenafil, tadalafil, finasteride only.
3. Add the **normalization engine** (all-in / per-tablet / per-month) and the **append-only history** write.
4. Build a minimal **admin verification queue** with screenshot capture.
5. Wire **Companies House Advanced Search (SIC 47730)** + **GPhC quarterly Excel** ingestion for discovery.
6. Ship a read-only Next.js comparison page for those 3 drugs across the first providers.

### B. Automate vs. manually verify
- **Automate (daily):** static-HTML independents where robots.txt/ToS permit — Dr Fox, Pharmica, Simple Online, Oxford, Medino, The Independent Pharmacy, Chemist4U.
- **Manually verify (with automation assist):** subscription/consultation/checkout-gated brands (Numan, Manual, Boots, LloydsPharmacy, ZAVA, Sons) and any provider behind Cloudflare or with restrictive ToS. Rationale: fee bundling and gated flows make automated numbers unreliable and legally riskier; a human confirming a screenshot weekly is cheaper and safer than brittle automation.
- **Always human-gate:** any anomaly >20%, any low-confidence parse, any first-order-vs-repeat ambiguity.

### C. Exact architecture/data flow
Discovery (CH/GPhC/CQC/NHSBSA/ODS) → provider registry → scheduler (tiered) → per-provider adapter (fetch→parse→normalize) → raw snapshot store + candidate observation → confidence + anomaly check → (auto-verify path → history) OR (screenshot → verification queue → human → history) → current-price materialized view → Next.js comparison UI.

### D. First 20 providers to integrate, and why
Order by *automation ease × market relevance × verifiability*: **Dr Fox, Pharmica, The Independent Pharmacy, Simple Online Pharmacy, Oxford Online Pharmacy, Medino, Chemist4U, Click Pharmacy, Chemist Click, UK Meds, PharmacyOnline.co.uk, Treated.com, Pharmacy2U, Superdrug Online Doctor, ZAVA, Numan, Manual, Boots Online Doctor, LloydsPharmacy Online Doctor, Sons.** Rationale: the first ~12 are static/parseable and give immediate daily coverage and price spread; the retail/subscription brands come later because they need Playwright/manual handling but are essential for consumer trust and market completeness.

### E. Risks most likely to break the system
- **Technical:** layout/selector changes silently breaking parsers (mitigate with confidence scoring + parser-break alerts); JS-rendering and Cloudflare/bot-management on big retail brands; subscription flows hiding true per-unit price.
- **Legal/contractual:** ToS prohibiting automated access; MHRA Blue Guide restrictions on advertising/displaying prescription-only medicine pricing and any incentivisation (Pharmacy2U's own affiliate terms cite the Blue Guide and forbid incentivisation); affiliate terms excluding POM commission. Get legal review before publishing POM prices and prefer factual price comparison over promotional framing.
- **Operational:** discount/first-order pricing drift making comparisons misleading; provider deregistration not caught in time (mitigate with GPhC subscription); over-reliance on any single source.

### F. Phased plan MVP → mostly-automated daily monitoring
- **Phase 1 (Weeks 1–2):** MVP above — 3 drugs, ~5 static providers, manual verification console, CH+GPhC discovery.
- **Phase 2 (Weeks 3–6):** expand to 12 static providers, add sitemap/content-diff change detection, tiered scheduler, Awin feed ingestion for OTC/corroboration, NHSBSA + CQC + ODS discovery automation.
- **Phase 3 (Weeks 7–12):** add Playwright worker pool for subscription brands, confidence scoring + anomaly detection + parser-break alerting, screenshot evidence, freshness-state machine.
- **Phase 4 (ongoing):** subscribe to GPhC Data Subscription Service (£400 premises-only) for daily status changes, add proxies only where proven necessary, tune cadence tiers by observed volatility, and expand to further men's-health categories.

## Caveats
- Individual providers' robots.txt and Terms of Service must be checked live per-provider before automating; this plan flags where manual/affiliate routes are safer but does not substitute for that per-site legal/technical check.
- Some provider details in the 30-row table (exact GPhC numbers, current affiliate membership, presence of anti-bot) are inferred from category evidence and should be verified during onboarding of each adapter.
- GPhC register totals differ slightly by source and date: the registers-data page cites 13,298 pharmacies while the mid-2026 premises search cited 13,311 — expect ±small drift; use the dated file you ingest as the source of truth.
- The Numan "max £35" first-order cap appears in Numan's own page copy but could not be independently confirmed at checkout; verify during adapter build.
- Prescription-only medicine pricing and its display are subject to MHRA advertising rules; obtain legal advice before launch.
- Prices cited (e.g., Dr Fox sildenafil "from 50p"/tadalafil "from 40p", Pharmica "from 99p", Numan "from £12/month" and first-order discounts) are point-in-time snapshots from 2026 and will drift — they illustrate fee structures, not current quotes.