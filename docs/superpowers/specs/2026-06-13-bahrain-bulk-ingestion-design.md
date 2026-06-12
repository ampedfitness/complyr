# Bahrain bulk ingestion design

Date: 2026-06-13. Approved direction: load all Bahrain regulations from the research workbook onto the dashboard as browsable, filterable overview records, with per filter contextual bullets. Rich detail fields are a later pass.

## Goal

Turn the consolidated Bahrain workbook (`Bahrain_Regulatory_Database_deep_crawl_v2_with_ids.xlsx`, sheet `Bahrain (2)`, 446 rows already stamped with `regulation_id`) into 322 JSON records under `data/documents/`, so the live dashboard browses and filters the full Bahrain dataset. This pass is collection and consolidation. Deep legal detail (obligations, citations, dates, bilingual text, typed relationships) is explicitly deferred to a later detail pass.

## Source data shape

The workbook stores one row per regulation and theme pairing. A single regulation is cross listed under several subcategories, and each row carries its own context specific description. Rows of the same regulation share a `regulation_id` (BH-R001 to BH-R322), and exactly one row per regulation is flagged `is_primary`. The 446 rows collapse to 322 unique regulations. The workbook columns map to the taxonomy: the Category column matches a taxonomy branch and the Subcategory column matches a leaf, across all 9 branches and 32 leaves.

## 1. Data model changes

Two additive changes to `schema/document.schema.json`, both safe for the 13 existing rich records.

- Relax the required set to the fields the workbook honestly provides: `id`, `title`, `jurisdiction`, `instrument_class`, `binding_status`, `lifecycle`, `themes`, `issuing_authority`, `summary`, `source_url`, `source_confidence`, `tags`. Every other property (obligations, applicability, relationships, citation, gazette, date_issued, date_effective, compliance_deadline, title_ar, official_title, official_title_ar, summary_ar, impact_note, impact_note_ar, last_verified, english_text_unofficial, notes) becomes optional. The existing rich records keep all their fields and continue to validate.
- Add an optional `theme_notes` property: an object keyed by leaf id whose values are the context specific blurbs, for example `{ "digital_health.health_data": "blurb about how this law applies to health data" }`. This carries the per filter bullet text. Records without it (the existing 13) simply fall back to `summary`.

## 2. Authorities

The sheet names 26 distinct issuing authorities; three already exist (`bh-king`, `bh-cbb`, `bh-pdpa`). The ingestion adds the missing Bahrain authorities to `data/authorities.json` first, so referential integrity holds. Expected new entries include the Telecommunications Regulatory Authority (`bh-tra`), National Cyber Security Center (`bh-ncsc`), Information and eGovernment Authority (`bh-iga`), Ministry of Justice Islamic Affairs and Waqf (`bh-moj`), National Health Regulatory Authority (`bh-nhra`), National Bureau for Revenue (`bh-nbr`), Ministry of Industry and Commerce (`bh-moic`), and the smaller bodies named in the sheet. Each entry gets an id, name, jurisdiction BH, a type, a one line mandate, and a website where known. Joint or one off authorities (for example WEF or UNESCO collaborations) map to the lead Bahrain body, and any authority recorded as UNVERIFIED maps to the closest known body with a note. Authority id choices are provisional and can be renamed later.

## 3. Ingestion script

A new Node ESM script `scripts/ingest-bahrain.mjs`, consistent with the repo's existing `.mjs` tooling.

Behaviour:

- Read the workbook sheet `Bahrain (2)`, group rows by `regulation_id` into 322 regulations.
- For each regulation, take the `is_primary` row for the core record fields, collect every row's leaf id into `themes`, and collect every row's leaf id and blurb into `theme_notes`.
- Write one file per regulation to `data/documents/bh-<slug>.json`, where the slug is a readable identifier derived from the instrument name, with a numeric suffix on collision.

Field mapping from workbook column to record field:

- Instrument name (EN) to `title`.
- Type to `instrument_class`, after stripping a trailing question mark and recording the uncertainty in `notes`. Values map to the controlled instrument class vocabulary (for example rulebook module to `rulebook_module`).
- Status to `lifecycle`: in force to `in_force`, draft or bill or proposal to `consultation`, and other statuses to their matching lifecycle value.
- Verified to `source_confidence`: official to `official`, secondary to `secondary`, official index to `pending_verification` (these came from listing pages, not the instrument itself).
- Category and Subcategory to `themes` (leaf ids).
- Summary to `summary`; the per row Summary values also feed `theme_notes`.
- One line description to `impact_note`.
- Source URL to `source_url`.
- Issuing authority to `issuing_authority`, resolved to an authority id.
- Related instruments parked in `notes` as free text; typed forward only relationships are deferred to the detail pass.
- `binding_status` derived from instrument class (laws, decrees, regulations, resolutions, decisions and rulebook modules are binding; strategies, policies, guidelines, frameworks, consultation papers and white papers are non binding), with the basis noted.
- `jurisdiction` set to BH; `tags` seeded from theme branch labels.

Honesty rules, per CLAUDE.md: the script never invents legal facts. Any record missing verified facts is written with `source_confidence: pending_verification` and a `notes` line stating what to confirm. Dates are left absent rather than guessed. Arabic fields are left absent for this pass.

The script is idempotent: rerunning it regenerates the same files. It prints a summary of records written, authorities added, and any rows it could not map.

## 4. Dashboard change

`src/components/Dashboard.tsx` and `src/components/RecordCard.tsx`: when at least one theme filter is active, a card renders the matching `theme_notes` blurbs as bullets, capped at the first three active theme filters. When no theme filter is active, the card shows `summary` only. Records without `theme_notes` always show `summary`. This is the only behavioural change; filtering, counts, search, sort, URL sync, and export stay as they are.

## 5. Out of scope (deferred to the detail pass)

Obligations, applicability statements, typed forward only relationships, citations, gazette references, effective and deadline dates, bilingual titles and summaries, impact notes in Arabic, and per document detail pages.

## Verification

`npm run validate` (schema plus referential integrity over all data files), `npm test`, and `npm run build` all pass. Plus a dev server visual pass on the dashboard with Bahrain loaded, confirming that filtering by a theme shows each regulation once with the correct contextual bullet, and that the no filter view shows summaries.
