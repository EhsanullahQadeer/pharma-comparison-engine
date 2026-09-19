# Implementation Playbook: Discovering, Verifying and Classifying UK Pharmacy Websites for a Men's-Health Price-Comparison Platform (2-Person Team, September 2026)

## TL;DR
- **Do not run automated website discovery across all ~13,000 GPhC rows first.** Only ~430 of them are NHS distance-selling (online) pharmacies, and the ED/men's-health commercial market is a curated list of perhaps 50–150 brands. Start by manually seeding 50–100 known online providers this week, then grow the confirmed list semi-automatically. A full-dataset SERP sweep is cheap enough (~£7–£20 one-off) to run *later*, but the expensive part is verification and human review, not the search API.
- **Best tooling stack for 2 devs:** DataForSEO (Standard queue, $0.60/1,000) or Serper.dev ($0.30–$1.00/1,000) for website discovery — Google's own Custom Search JSON API is closed to new customers and Bing's Web Search API was retired 11 August 2025 (legacy keys now return HTTP 410 Gone). Companies House free API for legal-entity cross-referencing (there is **no** website field, but it confirms the owner entity). Plain HTTP fetch + Cheerio for ~95% of verification/detection, with Playwright reserved only for the few JS-heavy sites; a Supabase `pg_cron` + Postgres queue background worker for orchestration. No enterprise scraping infra needed.
- **ED detection without ML:** fetch each candidate site's `sitemap.xml` and (if Shopify) `/products.json`, then match ED drug/route tokens (sildenafil, tadalafil, Viagra, Cialis, Spedra, vardenafil, avanafil) against **URL slugs, page titles and product records** — not free body text — and require the match to sit on a product/collection/consultation page (structured-data `Product`/`Offer` or a `/treatment|/consultation|/product|/collection|/online-doctor` path) to avoid blog false positives.

## Key Findings

### The dataset is smaller than it looks
The GPhC premises register is large but the relevant slice is tiny. GPhC's own "GPhC registers data" page lists **Pharmacies – 13,298**; the live register currently shows around 13,300 premises, and the PSA's 2024/25 monitoring report cites 13,220 premises as at 30 June 2025 — so treat "~13,200–13,300" as the working total and cite the specific source/date when it matters. Of the ~11,226 pharmacies in England, only **408 were distance-selling contracts** in the year to 31 March 2025 (Pharmacy Market Review 2025), and NHSBSA (via Statista) states that **"In 2024/25, there were 430 distance-selling pharmacies"** in England. The men's-health/ED commercial subset that actually matters for a price-comparison site is smaller still — a curated brand list.

This reframes the entire problem: it is a **prioritisation and verification** problem, not a big-data crawling problem. And the population is now effectively capped: under the 2025 amendment to the NHS (Pharmaceutical and Local Pharmaceutical Services) Regulations 2013, Community Pharmacy England confirms that **"Effective 23 June 2025, no new DSP applications will be accepted… the DSP route to establish a new pharmacy will now be closed."** The DSP list is therefore slow-moving — good news for a small team maintaining it.

### Free government sources do NOT hand you the website
- **NHS ODS ORD API** (`directory.spineservices.nhs.uk/ORD/2-0-0/`): documentation lists a `contacts` block with email/website/telephone/fax, but for F-code pharmacy records the website field is **effectively never populated** — verified live on record **FR877 (Hursley Road Pharmacy)**, whose entire contacts block was `{"Contact":[{"type":"tel","value":"02380 254252"}]}`, and on Pharmacy2U vaccination-site records that had no contacts block at all. This is consistent with ODS's own note that the BSA supplies only a minimal pharmacy feed ("only the Pharmacy HQ name is provided to ODS by the BSA"). So ODS is useful for the NHS ODS code, distance-selling role flags and canonical addresses — **but not for URLs.**
- **Companies House API** (free): there is **no website field anywhere in the API** — confirmed on the Companies House developer forum. It is valuable only to confirm the owner/legal-entity name (e.g. "Bristol Pharma Limited") and company number, which then becomes a strong on-page matching signal. Its rate limit, per the official developer guidelines, is **"up to 600 requests within a five-minute period"** per key (across all endpoints combined; a 429 is returned when exceeded).
- **NHSBSA** publishes the distance-selling flag via its Open Data Portal and dispensing datasets; this is the single most valuable free filter for prioritisation.

### Search-API economics favour a filtered approach — but full-dataset search is affordable
Website discovery costs are now trivial relative to engineering time:
- **DataForSEO SERP API, Standard (async) queue:** **$0.0006 per SERP ($0.60/1,000)**, $50 minimum deposit, ~5-min async delivery — ideal for batch jobs; deposited credits do not expire. (Priority queue $1.20/1,000, Live $2.00/1,000 — you do not need these for batch discovery.)
- **Serper.dev:** per ColdIQ's 2026 breakdown, **"$50 for 50,000 credits (~$1.00 per 1,000)… drops… to $0.30 per 1,000… 2,500 free queries with no credit card… paid credits valid for 6 months from purchase. A standard search returning up to 10 results costs 1 credit. Ask for 11–100 results and it costs 2 credits."** 1–2 s synchronous responses.
- **Google Custom Search JSON API:** $5/1,000, and per Google's own docs **"The Custom Search JSON API is closed to new customers… Existing… customers have until January 1, 2027 to transition"** — not an option for a new team.
- **Bing Web Search API:** retired; Microsoft's lifecycle notice states **"Bing Search APIs will be retired on August 11, 2025. Any existing instances… will be decommissioned completely, and the product will no longer be available for usage or new customer signup."** Legacy keys return HTTP 410; the "Grounding with Bing Search" replacement is Azure-only and is not a SERP API — avoid.

At these prices, even searching **all ~13,000 rows** once costs roughly **$8 on DataForSEO Standard or ~$13 on Serper's base tier** — a rounding error. The real cost is the verification fetch + human confirmation, so the filtering logic exists to cut *human* and *fetch* effort, not API spend.

### Verification and e-commerce detection can be almost entirely HTTP + Cheerio
Cheerio (Node HTML parser) is roughly an order of magnitude faster and lighter than a headless browser and handles static HTML in milliseconds; it cannot run JavaScript. Playwright/Puppeteer take ~2–5 s per page and far more RAM. For UK pharmacy sites — most of which are Shopify, WooCommerce or server-rendered — the initial HTML almost always contains the GPhC number (the regulator requires online pharmacies to display it on-page), the footer legal entity, JSON-LD structured data, and navigation, so **Cheerio suffices for the large majority**; reserve Playwright for the handful that render nothing without JS.

Two high-value shortcuts:
- **Shopify `/products.json`** is exposed by default on every Shopify storefront (up to 250 products/page, no auth, no key), returning titles, variants, vendors, tags. This is the single fastest way to both detect e-commerce and enumerate the ED catalogue. (A minority of stores disable it; log and move on.)
- **JSON-LD structured data** (`<script type="application/ld+json">`) with `@type: Product`/`Offer`/`OfferCatalog` is a reliable machine-readable signal that a page sells something.

### ED detection is a token-match-on-structured-fields problem
Every UK ED provider organises treatment around the same PDE-5 inhibitor vocabulary — sildenafil, tadalafil, vardenafil, avanafil and the brands Viagra, Viagra Connect, Cialis, Spedra, Levitra. Matching these tokens against **URL slugs, sitemap entries, page titles, and product/collection records** (not body prose) gives high precision. Real examples confirm the pattern: Dr Fox (`doctorfox.co.uk/erectile-dysfunction/`), Superdrug Online Doctor (`onlinedoctor.superdrug.com/erectile-dysfunction-treatment.html`), LloydsPharmacy Online Doctor (`/uk/erectile-dysfunction`), Pharmacy Online (`/online-doctor/erectile-dysfunction`), Ashcroft Pharmacy (`/online-doctor/ed/`). The `/online-doctor/` or `/consultation/` path plus an ED slug is a near-certain signal.

## Details

### 1. Website discovery at scale — the practical method

**Recommended primary tool: DataForSEO SERP API (Standard queue) or Serper.dev.** Both are pay-as-you-go, cheap, and return structured JSON. DataForSEO Standard ($0.60/1,000, ~5-min async) is the better fit for batch discovery because its async queue model matches a background worker; Serper (1–2 s, ~$1/1,000 at entry) is better if you want synchronous results while prototyping. Avoid Google CSE (closed to new customers) and Bing (retired).

**Query construction from the GPhC row.** For each prioritised row, build 1–2 queries from the fields you already have:
- Query A (strongest): `"{trading name}" {town} pharmacy` — e.g. `"Combe Down Pharmacy" Bath pharmacy`.
- Query B (fallback): `{owner legal entity} pharmacy {postcode outward}` — e.g. `Bristol Pharma Limited pharmacy BA2`.

Take the top 3–5 organic results as candidate URLs. Do **not** request 100 results (doubles Serper credit cost); top-10 is plenty and Google removed the `num=100` shortcut in September 2025 anyway.

**Cost to sweep the whole register once:** ~13,000 rows × 1 query ≈ $8 (DataForSEO Standard) to ~$13 (Serper base). With a 2-query fallback for misses, still under $25. **Conclusion: cost is not the constraint; do not over-engineer around it.**

**Batching/queue for 2 people:** store candidates in a Postgres `discovery_queue` table with a `status` column (`pending`/`searching`/`fetched`/`verified`/`failed`). A single Supabase `pg_cron` job (enabled by default on all projects in 2026) fires every minute and pulls a batch of N pending rows; or, better for long runs, a small always-on Node worker on a £4–£12/month VPS (Fly.io/Railway/Hetzner) polls the table. Keep concurrency low (2–5) and add 200–500 ms jitter. No Kafka/SQS/Redis needed — Postgres `SELECT … FOR UPDATE SKIP LOCKED` is a perfectly good job queue at this scale.

**Common Crawl** is a theoretical bulk option (free domain index) but is heavy to work with and stale; not worth the effort for 13,000 lookups when SERP APIs cost pennies. Skip it.

### 2. Filtering before searching — recommended order of operations

1. **Seed manually first (Week 1).** Enter the 50–150 known online men's-health/ED brands by hand (see the brand list below). This immediately covers the commercially important subset with zero discovery spend.
2. **Flag NHSBSA distance-selling premises.** Download the NHSBSA distance-selling / dispensing datasets from the Open Data Portal and join on ODS code / name+postcode to tag the ~430 DSPs in your table. These are the online-capable pharmacies by definition — search these next.
3. **Cluster by owner/legal entity.** The GPhC `owner` column lets you collapse chains: one hit on "Bestway National Chemists Limited" (Well) or a large multiple tells you about many premises at once. Rank owners by premises count and by whether the owner is a known online operator.
4. **De-prioritise the long tail** of single-site traditional community pharmacies (the bulk of the register). Only sweep them if/when you decide you want exhaustive coverage; they are unlikely to sell ED online.

This ordering means you spend human attention on ~600 records (seed brands + DSPs + big chains), and only optionally batch-search the remaining ~12,400.

**Known online men's-health / ED brands to seed (starter set, verify GPhC number on each):** Pharmacy2U, Dr Fox (doctorfox.co.uk), ZAVA / zavamed.com (and Asda Online Doctor by ZAVA), LloydsPharmacy Online Doctor, Superdrug Online Doctor, Boots Online Doctor, Well, Numan, Manual (manual.co), Pharmica (pharmica.co.uk), Peak Pharmacy online doctor, Ashcroft Pharmacy, Oxford Online Pharmacy, Pharmacy Online (pharmacyonline.co.uk), UK Meds, The Online Clinic, Menschem, Men's Pharmacy (menspharmacy.co.uk), Simple Online Pharmacy, Chemist4U, Medical Specialists, Online Pharmacy 4U, YourPharmacy, Hims/Hers (if UK-registered), Prescription Doctor, e-Surgery, Click Pharmacy, The Independent Pharmacy, PillTime.

### 3. Website verification and e-commerce/delivery detection

**(a) Verification — does this URL belong to this GPhC premises?** Fetch the homepage + `/about`, `/contact`, `/terms`, and footer with HTTP + Cheerio, then score candidate URLs with the weighted system already designed:
- GPhC registration number found on page (regulator mandates online pharmacies display it) → **very strong**.
- Companies House company number or exact legal-entity string (from the GPhC owner column, confirmed via Companies House API) → **very strong**.
- Postcode match → **strong**.
- Legal/trading name match → **strong**.
- Name-only fuzzy match → **weak**.

Accept a URL above a threshold (e.g. GPhC number alone, or postcode + legal name together). Persist the matched signals (jsonb) so you can audit later. Note that chains legitimately share one domain across many premises — attribute a shared domain to the **owner entity**, not to a single premises, and dedupe by domain.

**(b) Sells medicine online?** Signals, cheapest first: presence of `/products.json` (Shopify) returning medicine products; JSON-LD `Product`/`Offer`/`OfferCatalog`; a basket/cart route (`/cart`, `/basket`, "add to basket" buttons); an online-consultation/questionnaire flow (`/online-doctor`, `/consultation`, `/assessment`). Two or more signals = confirmed e-commerce/online-provider. An informational-only site will have none of these.

**(c) Delivery?** Check for `/delivery`, `/shipping`, `/delivery-information` routes and footer text; a Shopify/Woo checkout implies shipping. For UK online pharmacies delivery is near-universal, so treat *absence* of any delivery page on a confirmed e-commerce site as "unknown, flag for manual check" rather than "no delivery."

**Runtime:** one Node/TypeScript worker script, Cheerio + `undici`/`fetch`, structured-data parsing via a small JSON-LD extractor. Host on a cheap always-on VM or run as a scheduled Supabase Edge Function. Playwright only as a fallback branch for sites that return an empty DOM.

### 4. ED-service detection specifically

Pipeline per verified pharmacy site:
1. **Fetch `sitemap.xml`** (and any nested sitemaps). Cheapest, highest-signal source: it lists every indexable URL. Grep slugs for ED tokens.
2. **If Shopify, fetch `/products.json`** and match tokens against product `title`, `handle`, `tags`, `product_type`.
3. **Match token set:** `sildenafil, tadalafil, vardenafil, avanafil, viagra, "viagra connect", cialis, spedra, levitra, "erectile dysfunction", "erectile-dysfunction", ed-treatment`.
4. **Require product/service context to avoid false positives.** Count a hit only when the token appears in a **URL slug, sitemap URL, page `<title>`, `<h1>`, or a JSON-LD `Product`/`Offer`** — and ideally on a path like `/product`, `/collections`, `/treatment`, `/online-doctor`, `/consultation`. A token that appears **only** in body copy, a blog post (`/blog/`, `/news/`), or an FAQ is discarded. This cleanly separates "we sell tadalafil" (a `/treatments/tadalafil` product page) from "our blog mentions Viagra."
5. **Confidence bands:** dedicated ED product/consultation page = **confirmed**; token only in a men's-health category with no dedicated page = **probable**; token only in blog/body = **not counted**.

This needs no ML/NLP — it is deterministic string matching over structured fields plus a path allow-list, buildable in a day.

### 5. Automate vs manual — the realistic split for 2 people

**Do manually:**
- The initial 50–150 brand seed list (owner, URL, GPhC number, whether they do ED). One developer, 1–2 days. Faster and more accurate than any automation for the highest-value entries.
- Final confirmation of ED status for the top ~50 brands (a human eyeballs the treatment page). Prevents embarrassing errors on the brands users will actually compare.
- Adjudicating low-confidence website matches (the "name-only" tier).

**Automate:**
- Website discovery for the ~430 DSPs + large chains (SERP API).
- Verification scoring (GPhC/company-number/postcode/name matching).
- E-commerce, delivery and ED detection over confirmed sites (Cheerio + sitemap + products.json).
- Re-checks on a schedule (monthly `pg_cron`) so new ED offerings or new DSPs are picked up.

**When does full-13,000 auto-discovery become worth it?** Only when (a) your product has exhausted the confirmed online-ED list and needs breadth for SEO/coverage, or (b) you want to detect traditional pharmacies newly launching online. Because the search spend is negligible, the real trigger is **reviewer capacity**: run the full sweep only when you have a triage workflow that doesn't require a human to touch each result. Until then, stay on the curated + DSP + chain list.

### 6. Concrete 2–4 week pipeline

**Week 1 — Foundations & seed (highest ROI):**
- Schema: add `pharmacy_websites` (url, gphc_id FK, match_score, matched_signals jsonb, is_ecommerce, has_delivery, offers_ed, ed_confidence, last_checked) and `discovery_queue`. (0.5 day)
- Manually enter 50–150 known online brands with URLs + ED flags. (1–2 days)
- Join NHSBSA distance-selling flag + cluster by owner; tag priority rows. (1 day)
- Register API keys: DataForSEO or Serper, Companies House. (0.5 day)

**Week 2 — Discovery + verification worker:**
- Node/TS worker: pull queue → SERP query → store candidate URLs. (2 days)
- Fetch + Cheerio verification scorer (GPhC number, company number, postcode, name). (2 days)
- Companies House enrichment for owner→company-number. (0.5 day)

**Week 3 — Detection:**
- E-commerce/delivery detection (products.json, JSON-LD, cart/consultation routes). (2 days)
- ED token matcher over sitemap + products.json + titles with path allow-list. (1.5 days)
- Human review UI/spreadsheet export for low-confidence rows. (1 day)

**Week 4 — Hardening & schedule:**
- `pg_cron` monthly re-check; retry/backoff; robots.txt honouring; logging. (2 days)
- Run the full ~430 DSP + chain sweep; triage results. (1–2 days)
- Optional: batch-search the long tail if reviewer capacity allows.

Two developers can comfortably build seed + discovery + verification + ED detection in this window; the long-tail sweep is a stretch goal.

### 7. Cost estimate (GBP, monthly)

**(a) Curated 50–100 known pharmacies:**
- SERP API: ~50–100 queries + re-checks → effectively **£0** (within free tiers / a few pennies).
- Companies House: **£0** (free).
- Verification/detection fetches: self-hosted, **£0** API cost.
- Hosting (small always-on worker VM, e.g. Hetzner/Fly.io/Railway): **£4–£12/month**.
- Supabase: existing project; cron/edge included (**£0 marginal**, or ~£20/month Pro if not already on it).
- **Total: ~£5–£30/month**, dominated by hosting.

**(b) Scaling to the full ~13,000 GPhC dataset:**
- One-off full SERP sweep (1–2 queries each): **~$8–$25 one-off (~£7–£20)**, not monthly.
- Monthly re-checks of confirmed sites only (say 500 sites): pennies.
- Extra fetch bandwidth/compute: negligible; still one small worker, perhaps bumped to **£10–£20/month**.
- Optional managed scraping fallback (pay-as-you-go scraping API for the few blocked/JS-heavy sites): **£0–£20/month**.
- **Total: ~£15–£45/month + a one-off ~£20 sweep.**

The headline: this whole capability runs for **well under £50/month** either way. Budget your *time*, not your API spend.

### 8. Risks and practical gotchas

- **Rate limits:** Companies House 600 req/5 min per key (0.5 s spacing is safe; use the `X-Ratelimit-Remain` header). SERP APIs are effectively unlimited at your volume but respect their concurrency. Keep your own fetches to 2–5 concurrent with jitter.
- **Anti-bot/blocking:** most pharmacy sites are small and won't block a polite Cheerio fetch with a real User-Agent and low rate. A minority (Cloudflare, JS-only) will need Playwright or a scraping API; don't build heavy anti-bot infra for a handful — flag and handle manually.
- **False positives (ED):** the biggest risk is blog/FAQ mentions of Viagra. The path allow-list + structured-field requirement mitigates this. Second risk: matching the wrong website to a premises (chains share a domain) — dedupe by domain and attribute shared domains to the owner entity.
- **False negatives:** JS-rendered catalogues invisible to Cheerio; sites that disable `/products.json`; ED offered via a generic "men's health" page with no dedicated slug. Mitigate with a Playwright fallback and a "probable" band for manual review.
- **Legal/ToS:** In the UK, scraping public non-personal data is lawful under the Data Protection Act 2018 / UK GDPR / Computer Misuse Act 1990 framework, provided you respect robots.txt, don't circumvent technical barriers, and rate-limit. Pharmacy product/price data is non-personal business fact — low risk. **Honour robots.txt and keep a dated snapshot** (UK courts and the ICO treat compliance as good-faith evidence). Do not scrape anything behind a login or a consultation questionnaire (that can involve personal/health data). Store only business facts (URL, products, prices, ED yes/no).
- **Safe corners to cut now:** no distributed queue, no proxy rotation, no headless-browser farm, no exhaustive 13,000-row sweep on day one, no perfect delivery detection. **Not safe to cut:** on-page verification (wrong-site matches poison a price-comparison product), robots.txt compliance, and human sign-off on the top brands users actually see.

## Recommendations

### A. This week (given GPhC data is already imported)
1. Add the `pharmacy_websites` + `discovery_queue` tables and a `distance_selling` boolean to your existing GPhC table.
2. Download the NHSBSA distance-selling dataset from the Open Data Portal and flag the ~430 DSP rows.
3. By hand, enter 50–150 known online men's-health/ED brands (list above) with URL, GPhC number and an ED yes/no — this alone makes the product demoable.
4. Register free API keys: **Companies House** and **DataForSEO** (or Serper). Only fund the $50 minimum deposit when you start the batch step.

### B. 2–4 week build plan
Follow the Week 1–4 plan above: seed + NHSBSA join (W1) → discovery + verification worker (W2) → e-commerce/delivery/ED detection (W3) → scheduling, robots.txt, hardening and the ~430-DSP+chain sweep (W4). Keep everything in one Node/TS worker + Supabase; use `SELECT … FOR UPDATE SKIP LOCKED` as the queue.

### C. Tooling to sign up for first
- **DataForSEO SERP API (Standard queue)** — cheapest batch discovery ($0.60/1,000), async model fits a worker. (Serper.dev is the synchronous alternative; 2,500 free queries to prototype.)
- **Companies House API** — free, for owner→company-number verification signal.
- **Cheerio + undici (Node)** — verification/detection; **Playwright** only as a fallback dependency.
- **Supabase pg_cron + a £4–£12/month worker VM** (Fly.io/Railway/Hetzner) — orchestration.
- **NHSBSA Open Data Portal** (no signup) — distance-selling flag.
- Skip: Google CSE (closed), Bing (retired), Common Crawl (not worth it), enterprise scraping platforms (premature), NHS ODS as a website source (field is empty for pharmacies).

**Benchmarks that change the plan:** if manual review can't keep up with discovery output → pause the sweep, don't add API budget. If >20% of target sites block Cheerio → adopt a pay-as-you-go scraping API rather than self-hosting proxies. If the confirmed-ED list plateaus and you need coverage/SEO breadth → then, and only then, run the full ~13,000-row sweep.

## Caveats
- Exact SERP-API prices are prepaid/pay-as-you-go and change; the per-1,000 figures cited were verified across mid-2026 sources — confirm the current pack price at signup. Serper credits expire after 6 months; DataForSEO deposits do not.
- DSP counts differ slightly by source and date (GPhC 408 vs NHSBSA 430 vs Pharmacy Market Review); treat ~400–430 as the working figure. The GPhC premises total similarly varies (13,220–13,311 depending on report/date); use ~13,200–13,300.
- The ODS website-field finding is based on a small live sample (record FR877 and Pharmacy2U sites) plus ODS's documented minimal BSA pharmacy feed; a handful of pharmacy records may carry a website, but you cannot rely on it as a source.
- Legal position is general guidance, not legal advice; if you later scrape at higher volume or touch anything resembling personal/health data, get a UK data-protection review.
- Website structures change; the detection heuristics (paths, products.json, JSON-LD) will need occasional maintenance as sites re-platform.