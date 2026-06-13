# Complyr handoff

Open source taxonomy + curated dataset of GCC digital regulation with a static dashboard. Live: https://ampedfitness.github.io/complyr/ Repo: github.com/ampedfitness/complyr. Owner reviews everything; he is a digital policy analyst.

## Stack and commands

Astro 6 + React 19 islands, vanilla CSS, no backend. Deploys to GitHub Pages on push to main (deploy.yml); ci.yml validates data + builds on every push/PR.

- `npm run dev` / `npm run build`
- `npm run validate` — Ajv (2020 build) schema + referential integrity for all /data files
- `npm test` — validator smoke tests against scripts/fixtures

## Data model, non-negotiable rules

- One JSON file per instrument in `data/documents/<id>.json`; file name must equal id; id starts with lowercase jurisdiction code (bh sa ae qa kw om).
- Three independent axes: instrument_class (what it is), themes (leaf ids only, parents computed), lifecycle (current standing). Never mix.
- Relationships forward-only (amends, repeals, supersedes, implements, consults_on, enabled_by, references); inverses computed at build; conditionally_binding requires enabled_by.
- issuing_authority must exist in `data/authorities.json`.
- Never invent legal facts. Unverified = source_confidence pending_verification + a notes field saying what to check. Promulgating decrees fold into the law's citation, never separate records.
- Taxonomy v2.0.0: 9 branches, 32 leaves, digital regulation only; every node has a scope statement; no other/misc buckets, gaps are fixed by new leaves.
- Dataset scope: digital regulation only. An instrument qualifies when its primary subject is digital technology, data, networks, online activity, or digitally delivered services. Non digital instruments are out of scope even when issued by a digital authority; traditional domain instruments enter only when they specifically regulate the digital channel or technology.

## Site structure

- `src/pages/index.astro` — front page built to the owner's GPT mockup (June 2026): split hero, left = H1 ("Verified." in accent, rest of line 2 in ink-soft), short Arabic subline, two ledes, pill search (GET form into dashboard ?q=, "/" focuses it); right = 4-cell stat band with uppercase labels and sublabels + classification axes card. Then jurisdiction flag tiles (zone-head has a "View all on dashboard" link), then a two-column updates zone: timeline card with client-side filters (All updates chip + jurisdiction/instrument selects, rows carry data-jur/data-cls, type chips hide while filtered) and a confidence-legend sidebar card. Contribute panel removed June 2026, owner manages entries himself; do not reintroduce public contribution CTAs. Owner wants dense layouts, no big empty zones; he supplies GPT mockups for big visual changes, match them. Motion: load choreography + IntersectionObserver scroll reveals (js-reveal class, once only) behind prefers-reduced-motion. Site-wide custom cursor lives in Base.astro + global.css: accent dot tracks the pointer 1:1, glow ring trails it, native cursor hidden via :root.cursor-custom (owner's explicit choice over my recommendation); fine pointers only, reduced motion and touch keep the native cursor. scripts/verify-home.mjs is a Playwright check for this page. Scoped styles in-file.
- `src/pages/dashboard.astro` + `src/components/Dashboard.tsx` — faceted browser: left rail (country chips, category tree, year chips, authority filtered by country, instrument, binding, lifecycle, all with counts), top bar (search, sort, EN/AR toggle, Export JSON/CSV of filtered set), URL-synced filters, active filter chips, card grid; cards expand inline (RecordCard.tsx + FamilyTree.tsx).
- `src/pages/developments.astro` — redirect only (old URL).
- `src/lib/data.ts` loads /data at build; `src/styles/global.css` holds the design system: light/dark via CSS vars on [data-theme], indigo accent (#5048e5 light, lighter in dark) on white cards over lavender-grey paper, per-country tints (--jur-*), 12 to 16px radii, pill badges, fonts Inter Variable / IBM Plex Mono / Plex Sans Arabic.

## Design layer (June 2026 restyle)

- Direction: faithful match to the owner's mockup (indigo SaaS style), applied site wide and approved. Spec: `docs/superpowers/specs/2026-06-11-site-restyle-design.md`. Feature inventory the design serves: `docs/design/feature-brief.md`.
- All tokens live in `global.css`; the dashboard components were restyled through shared class names only, zero logic changes. When restyling further, change tokens first and component CSS second.
- Deliberate deviation from the mockup: no EN language dropdown in the header. The EN/AR content toggle stays dashboard-only per the feature brief; UI labels stay English everywhere.
- Confidence display mapping (home page badges and legend): official = High (green shield), secondary = Medium (amber shield), pending_verification = Pending (amber outline). Keep these visible in any future design; verification honesty is a feature.
- Flags are simplified inline SVGs in `src/components/Flag.astro` (jurisdiction tiles + updates table). Not exact national flags, just readable at small sizes.
- Fonts: Inter Variable replaced Fraunces, Source Serif 4, and IBM Plex Sans (packages removed). IBM Plex Mono and Plex Sans Arabic stay. The old --display/--serif CSS vars still exist but point at Inter so legacy class rules keep working.
- Home page month timeline: newest month renders as a table with one-line summaries; up to three older months are native details/summary rows with type-count chips, no JS.
- Verify with `npm run validate`, `npm test`, `npm run build`, plus a visual pass in both themes. Caution: headless Edge screenshots on this machine can render a viewport wider than --window-size and look like mobile overflow; trust CDP device emulation (or a real device) before "fixing" responsive bugs.

## Dataset pipeline (current plan)

Owner researches via GPT chats using `docs/research/deep-research-prompts.md` (Workflow A): one Excel workbook, one tab per country, fixed 14 columns, one prompt run per Category+Subcategory pair; prompt embeds the Type/Status controlled vocabulary and Arabic search instructions. When a workbook arrives: convert rows to JSON records (map labels to taxonomy ids, build relationships from the Related instruments column, write impact_note as analyst-to-executive briefing, obligations itemised), add missing authorities first, run validate, commit per country.

Current dataset: 13 curated records plus 321 Bahrain catalogue records ingested from the research workbook by scripts/ingest-bahrain.py (overview tier: filtering and summaries, with per leaf theme_notes bullets; detailed legal fields deferred). Other five countries pending.

## Writing rules (all prose, code copy, dataset, README)

No em dashes or dash punctuation. Plain professional tone, active voice, sentence case. No signposting. Hyphenated compounds are fine.

## Open items

- Per-document detail pages: cards currently expand inline; owner wants dedicated pages designed later (cards are "clickable, we'll make that page later").
- Author attribution placeholders `[Author name]` in README, LICENSE, LICENSE-DATA.
- Records flagged in notes: SDAIA AI Ethics v1 2022 record + supersedes link, 2024 amendments to SA implementing regulation and transfer regulation, parallel public GenAI guidelines, Bahrain 2022 ministerial resolutions, QFC DP Regulations 2021, official source links for BH/QA/KW/OM records.
- Dashboard was deliberately scoped as a browse catalogue, not analytics; owner rejected a deadline tracker (informational register, not compliance management).
