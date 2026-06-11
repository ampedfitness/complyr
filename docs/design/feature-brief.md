# Complyr feature inventory

Functional specification of every element on the site, for design work. Contains no visual direction; the design layer decides all appearance.

## What the product is

Complyr is an open source register of GCC regulation (Bahrain, Saudi Arabia, UAE, Qatar, Kuwait, Oman): a curated, source-verified dataset of regulatory instruments with a web interface. It is informational, not legal advice and not compliance management software. Users: policy analysts, compliance and privacy professionals, lawyers, researchers.

Data vocabulary the interface exposes:
- 6 jurisdictions
- 17 categories with 63 subcategories (themes)
- 16 instrument types: law, decree, regulation, resolution, regulator decision, circular, rulebook module, national strategy, policy, guideline, framework, handbook, code of practice, standard, consultation paper, white paper
- 6 lifecycle states: in consultation, enacted, in force, amended, repealed, superseded
- 3 binding statuses: binding, non binding, conditionally binding
- 3 source confidence levels: official, secondary, pending verification
- 7 relationship types between documents: amends, repeals, supersedes, implements, consults on, enabled by, references

## Global elements

- Header, persistent on scroll: wordmark linking to home; nav links Home, Dashboard, GitHub (external); theme toggle.
- Theme: light and dark; user choice persisted across visits; defaults to system preference; every component needs both states.
- Footer: one line project description; one line licences and disclaimer (MIT code, CC BY 4.0 data, not legal advice).
- Language: dashboard has an English/Arabic content toggle that swaps titles, summaries, and impact notes; Arabic content renders right to left; UI labels stay English everywhere.

## Page: Home

1. Project metadata: establishment year, total entry count, authority count, coverage year range. All computed from the data.
2. Headline and an Arabic subline.
3. Intro: two short paragraphs (the gap, the answer).
4. Classification summary: the three axes (instrument class, themes, lifecycle), each with a one line explanation.
5. Jurisdiction tiles: six, each showing country code, full country name, live entry count; each links to the dashboard pre-filtered to that country.
6. Latest updates feed: entries grouped by month of issue, newest month first and emphasised, up to four month groups shown. Each month group shows month name, year, entry count. Each entry shows: issue date, country, instrument type, title, one sentence summary (newest month only), and links into the dashboard locating that record. Followed by a link to the full dashboard.
7. Contributor section: short explanation of the PR workflow, three numbered steps, repository link.

## Page: Dashboard

Faceted catalogue browser. Two zones: filter sidebar and results area. On small screens the sidebar becomes a full screen overlay opened by a button showing the active filter count.

Filter sidebar. All groups combine (AND between groups, OR within a multi select). Every option shows its result count.
- Country: six options, multi select.
- Category: 17 top level options; selecting one reveals its subcategories for optional narrower selection; single selection at either level; categories with zero entries are summarised in one line, not listed.
- Year: one option per year present in the data, multi select.
- Authority: single select; the list automatically narrows to authorities of the selected countries, with a note saying so; a selection that becomes hidden is automatically cleared.
- Instrument type: single select, only types present in the data.
- Binding status: single select.
- Lifecycle: single select.

Toolbar:
- Search: free text, matches English and Arabic titles, official titles, summaries, and tags.
- Sort: newest first, oldest first, title A to Z.
- English/Arabic content toggle.
- Export JSON and Export CSV: each downloads only the currently filtered records; CSV is flattened (id, title, jurisdiction, type, binding, lifecycle, themes, authority name, dates, citation, summary, source URL, confidence, last verified).

Result meta row:
- Count: "X of Y instruments".
- Active filters as individually removable chips, plus clear all.
- Every filter, search, and sort choice is written to the URL, so any filtered view is a shareable, bookmarkable link, restored on page load.

Results: grid of record cards.

Compact card: country code, instrument type, year, title, one sentence summary, an upcoming compliance deadline indicator (only when the deadline is in the future), a pending verification indicator when the record awaits source confirmation.

Expanded card (clicking a card toggles it open; it will later become a link to a detail page):
- Full summary (2 to 3 sentences).
- Impact note: a paragraph answering who is affected, what changes, what action is needed.
- Obligations: list of discrete duties, each with the obligated party, description, and deadline where one exists.
- Applicability: entity types, sectors, extraterritorial yes/no, penalties summary, grace period.
- Instrument family: a hierarchy computed from the typed relationships; the enabling instrument at the top, related instruments nested beneath labelled by relationship type, the current document highlighted. Inverse relationships are computed automatically (recording "X amends Y" makes Y show "amended by X").
- Citation: formatted legal citation with a copy to clipboard button and copied feedback.
- Metadata: issuing authority name, date issued, date effective, theme labels.
- Source block: gazette name, number, and issue date; link to the official text; source confidence label; last verified date; a note when the binding text is Arabic and the English is an unofficial translation.

Empty state when no records match, with guidance to loosen filters or contribute.

The old /developments URL redirects to the dashboard.

## Page to design: document detail

Each record will get its own page; the expanded card above is the interim version. Every field listed in the expanded card is available, plus: official title in English and Arabic, plain title in Arabic, tags, the authority's one line mandate and website. Many fields are nullable: records may lack a gazette number, Arabic text, obligations, applicability, citation, effective date, or deadline, and the page must read complete without them.

## Behavioural requirements

- Static site, all filtering and search client side, instant response.
- Must scale visually from the current 13 records to several hundred.
- Fully responsive; keyboard operable; visible focus; honours reduced motion preferences.
- Verification honesty is a feature: pending verification and source confidence indicators must remain visible in any design.
