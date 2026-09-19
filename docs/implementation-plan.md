# Implementation Plan: UK Men's-Health Pharmacy Price Comparison Platform
### Provider Discovery, Verification & Price Data System — Build Order for a 2-Person Team

Status: GPhC dataset already imported (~13,000 rows). This plan covers everything from here to a working, price-comparison product.

---

## 1. Guiding Principle

**Don't try to process all ~13,000 GPhC rows.** Only ~400–430 are NHS distance-selling pharmacies, and the commercially relevant ED/hair-loss market is a curated list of ~50–150 brands. Build in this order:

1. Manually seed known providers → get a working product fast.
2. Layer in verification/scoring → make it trustworthy.
3. Layer in discovery automation → make it grow without you.
4. Layer in price collection → make it useful.
5. Layer in freshness/monitoring → make it stay correct.

Two people should work in parallel tracks that converge at the `provider` table (see §7).

---

## 2. Target Architecture (end state)

```
GPhC / NHSBSA / CQC / Companies House (registries)
        │
        ▼
  raw registry_record (append-only)
        │
        ▼
  entity resolution → legal_entity / pharmacy_premises / provider
        │
        ▼
  website discovery (SERP API) → website_candidate
        │
        ▼
  verification & scoring (Cheerio fetch: GPhC no. / company no. / postcode / name)
        │
        ▼
  auto-approve (≥ threshold) ──────┐
        │ (below threshold)         │
        ▼                           │
  admin review queue ───────────────┤
        │                           ▼
        └──────────────────► provider_website (confirmed)
                                    │
                                    ▼
                     service detection (sitemap / products.json → ED, hair loss, PE)
                                    │
                                    ▼
                          provider_service (confirmed)
                                    │
                                    ▼
        price adapters (per-provider: static HTML / JSON-LD / Playwright / manual)
                                    │
                                    ▼
              raw_snapshot → price_observation → confidence/anomaly check
                                    │
                       ┌────────────┴────────────┐
                  auto-verified              manual verification queue
                       │                           │
                       └───────────► price_history (append-only)
                                                    │
                                                    ▼
                                    current price view → Next.js comparison UI
```

This is the same pipeline from the deep-research reports, simplified to what a 2-person team actually builds first vs. later (marked below).

---

## 3. Database Schema — Changes to Make Now

You already have the GPhC table. Add these (Supabase/Postgres):

**Core entities**
- `legal_entity` — `id, company_number (unique), legal_name, status, previous_names[], source_watermark`
- `pharmacy_premises` — your existing GPhC import, extended with: `owner_legal_entity_id → legal_entity`, `distance_selling (bool)`, `last_confirmed`
- `provider` — the consumer-facing brand (e.g. "Numan", "Dr Fox"). `id, brand_name, primary_legal_entity_id, status, is_online (bool), review_state`
- `provider_pharmacy_relationship` — `provider_id, pharmacy_premises_id, role (dispenses_for/prescribes_for/same_entity), evidence, valid_from, valid_to`

**Website & verification**
- `provider_website` — `id, provider_id, domain, url, is_primary, match_score, matched_signals (jsonb), verification_confidence, last_checked, http_status`
- `website_candidate` — `id, provider_id (nullable), candidate_url, discovery_method (serp/manual/affiliate), raw_signals (jsonb), score, disposition (pending/promoted/rejected)`

**Services & pricing**
- `provider_service` — `id, provider_id, category (erectile_dysfunction/hair_loss/premature_ejaculation), detected (bool), evidence_url, detection_method, first_seen, last_seen, active (bool)`
- `raw_snapshot` — pointer to object storage (HTML/JSON blob), `provider_id, fetched_at, method`
- `price_observation` — normalized: `provider_id, product, strength, pack_size, medicine_price, consultation_fee, prescription_fee, delivery_fee, discount, is_first_order, all_in_price, confidence_score`
- `price_history` — append-only, same shape as above + `verified_by (auto/human), verified_at`

**Operational / audit**
- `registry_record` — raw append-only ingestion per source (`source, source_pk, payload jsonb, content_hash, fetched_at`)
- `provider_discovery_event`, `provider_status_event` — event log (`event_type, old_value, new_value, source, detected_at`)
- `discovery_queue` — simple job queue (`status: pending/searching/fetched/verified/failed`)
- `verification_queue` — human review items, links to `website_candidate` or `price_observation`

**Do this first (Day 1–2):** create these tables, even empty, before writing any pipeline code. Agree the `provider` and `provider_website` shapes between both developers before either track starts — this is the one integration point that's expensive to change later.

---

## 4. Build Order (4 phases)

### Phase 1 — Manual seed + schema (Week 1)
- Create all tables above.
- Manually enter 50–150 known online ED/hair-loss brands directly into `provider` + `provider_website` + `provider_service`, with GPhC number, domain, and treatment categories hand-verified. (List from prior research: Dr Fox, Pharmica, Numan, Boots Online Doctor, LloydsPharmacy Online Doctor, Superdrug Online Doctor, ZAVA, The Independent Pharmacy, Simple Online Pharmacy, Oxford Online Pharmacy, Medino, Chemist4U, Manual, Sons, Click Pharmacy, Chemist Click, UK Meds, Treated.com, PharmacyOnline.co.uk, Pharmacy2U, Well, Ashcroft Pharmacy, Men's Pharmacy, e-Surgery, Prescription Doctor.)
- Download NHSBSA distance-selling dataset; flag the ~430 DSP rows in your GPhC table via ODS code/name+postcode join.
- Register API keys: Companies House (free), DataForSEO or Serper.dev (deposit only when Phase 3 starts).

**Why first:** gives you a demoable product immediately and a ground-truth set to test your scoring/matching logic against later.

### Phase 2 — First price adapters (Week 2, parallel to Phase 1's second half)
- Build adapters for the 3 easiest static-HTML providers: Dr Fox, Pharmica, The Independent Pharmacy.
- Limit to 3 drugs: sildenafil, tadalafil, finasteride.
- Build the normalization engine: `all_in = medicine + consultation_fee + prescription_fee + delivery_fee − discount`, output per-tablet and per-month.
- Write to `raw_snapshot` → `price_observation` → `price_history` (append-only from day one, even before you have anomaly detection).
- Minimal admin queue: a table view is fine, doesn't need to be pretty yet.

### Phase 3 — Discovery + verification automation (Weeks 3–4)
- Discovery worker: pull `discovery_queue` → SERP query (name + town, fallback owner + postcode) → store `website_candidate` rows.
- Verification worker: fetch candidate homepage/footer/contact with Cheerio → extract GPhC number, company number, postcode, legal name → score (see §5) → auto-approve or push to `verification_queue`.
- **Test this against your Phase 1 seed set first** — you already know the correct answers, so you can measure precision before trusting it on unknowns.
- Run discovery against the ~430 DSP-flagged rows + large chain owners next (not the full 13,000 yet).
- Service detection worker: fetch `sitemap.xml` + `/products.json` (if Shopify) → match ED/hair-loss/PE drug tokens against URL slugs/titles/product records only (not body text) → populate `provider_service`.

### Phase 4 — Scale, harden, monitor (Month 2+)
- Expand price adapters to gated providers (Numan, Boots, LloydsPharmacy) using Playwright + mandatory human verification.
- Add GPhC quarterly list re-import, CQC, Companies House streaming for ongoing discovery (new entrants, closures, renames).
- Add the freshness/status state machine (`checked_today / auto_verified / manually_verified / suspected_change / stale / unavailable / provider_removed`) with tiered recheck cadence (daily for easy static sites, weekly for gated ones).
- Optionally run the full 13,000-row SERP sweep once reviewer capacity allows — cost is trivial (~£10–£20 one-off), the constraint is human review throughput, not API spend.
- Public-facing Next.js comparison UI goes live once Phase 2+3 have enough confirmed providers with priced treatments.

---

## 5. Verification & Confidence Scoring (concrete, use from Phase 3)

Fetch candidate homepage + about/contact/footer. Score:

| Signal | Weight |
|---|---|
| GPhC registration number found on page, matches candidate | +55 |
| Companies House company number on page, matches | +45 |
| Postcode exact match | +20 |
| Legal company name match | +18 |
| schema.org Organization/Pharmacy match | +12 |
| Brand/trading name only | +6 |
| Comparison/review/directory site detected | −40 |
| GPhC number present but belongs to a different provider | −50 |

**Thresholds:**
- **Auto-approve:** ≥70 AND at least one hard identifier (GPhC or company number) present.
- **Human review:** 35–69, or ≥70 from soft signals only.
- **Reject:** <35.

---

## 6. Service Detection Logic (ED / hair loss / PE) — no ML needed

1. Fetch `sitemap.xml`; if Shopify, fetch `/products.json`.
2. Match token set (`sildenafil, tadalafil, vardenafil, avanafil, viagra, cialis, spedra, "erectile dysfunction"` etc.) against **URL slugs, sitemap entries, page titles, product/collection records** — never raw body text.
3. Require the match to sit on a path like `/treatment`, `/product`, `/collections`, `/online-doctor`, `/consultation` — a token only in `/blog/` is discarded.
4. Confidence bands: dedicated product/consultation page = **confirmed**; category mention with no dedicated page = **probable**; blog/body only = **not counted**.

Same logic pattern for hair loss (finasteride, minoxidil, dutasteride) and PE (dapoxetine, Priligy, Fortacin).

---

## 7. Two-Person Track Split

**Person 1 — Discovery & Provider Database**
Phase 1 schema + seed → Phase 3 discovery/verification/service-detection workers → Phase 4 registry expansion (GPhC/CQC/CH streaming).

**Person 2 — Price Collection & UI**
Phase 2 price adapters + normalization → Phase 3 (support, lighter load) → Phase 4 gated-provider adapters + freshness system + public UI.

**Convergence point:** by end of Week 2, agree the `provider`/`provider_website` schema so Person 2's price adapters reference `provider_id` as a foreign key from the start, rather than a hardcoded list that needs migrating later.

---

## 8. Edge Cases to Handle Explicitly

- **Chains sharing one domain across many GPhC premises** (Boots, LloydsPharmacy, Well): attribute the domain to the **provider/owner brand**, not to individual premises. Dedupe by domain.
- **White-label dispensing** (one GPhC pharmacy fulfilling for multiple consumer brands): expect one GPhC number on several sites — this is normal, not a scoring error. Model via `provider_pharmacy_relationship`, don't auto-merge providers that share a dispenser.
- **Brand ≠ prescriber ≠ dispenser** (e.g. LloydsPharmacy Online Doctor's prescribing arm is a separate registered company): always resolve to three possible distinct entities, don't assume brand = premises.
- **Rebrands**: Companies House previous-names + CQC predecessor links catch these; without checking, a rename looks like a closure + new entrant.
- **First-order vs. repeat pricing**: never show only the discounted first-order number as the headline price — store both, label clearly.
- **Expired/invalid discount codes**: every discount needs validity metadata; exclude expired ones from `all_in_price`.
- **JS-rendered sites Cheerio can't read**: flag and fall back to Playwright only for the minority that need it — don't build Playwright-first.
- **Anti-bot / blocked sites**: don't fight Cloudflare; switch that provider to manual/affiliate-feed collection.
- **GPhC number present but for the wrong provider**: strong negative signal (−50) — catches shared-platform confusion and impersonation.
- **Aggregator/comparison/review sites** (including competitors) being matched as "the pharmacy": strong negative signal (−40), maintain a block-list.
- **Legal/compliance**: don't scrape anything behind a login or consultation questionnaire (personal/health data risk); honour robots.txt; store only business facts (URL, products, prices); get legal review before publishing prescription-only (POM) pricing given MHRA Blue Guide advertising restrictions.

---

## 9. What NOT to Build Yet

- No distributed job queue (Postgres `SELECT … FOR UPDATE SKIP LOCKED` is enough at this scale).
- No proxy rotation or headless-browser farm — Cheerio handles most sites.
- No full 13,000-row discovery sweep — start with seed + DSP + chains (~600 records).
- No GPhC paid Data Subscription Service yet (£400–£600/yr) — revisit only once quarterly-refresh latency is visibly causing stale listings.
- No ML/NLP for service detection — deterministic token matching on structured fields is sufficient and far cheaper to build/debug.

---

## 10. First Two Weeks, Concretely

| Day | Person 1 | Person 2 |
|---|---|---|
| 1–2 | Create schema (all tables in §3) | Same (shared task) |
| 2–3 | Manually seed 50–150 providers | Scaffold Next.js app + price adapter interface |
| 3–5 | NHSBSA DSP join + owner clustering | Build Dr Fox + Pharmica adapters (static HTML) |
| 6–7 | Register Companies House + SERP API keys, test discovery query on 10 seed providers | Build normalization engine + `price_history` writes |
| 8–10 | Verification scorer against seed set (measure precision) | Add The Independent Pharmacy adapter; minimal admin table view |

By end of Week 2 you have: a seeded provider database, a working scoring algorithm validated against known answers, 3 live price adapters for 3 drugs, and normalized all-in pricing writing to an append-only history table.
