# Complyr visual layer brief

Context document for AI-assisted design work. Describes the product, every existing feature and state, and the constraints any visual design must satisfy.

## Product

Complyr is an open source register of GCC regulation: Bahrain, Saudi Arabia, UAE, Qatar, Kuwait, Oman. It is a curated, verifiable dataset with a web interface, not a legal advice tool and not a compliance management product. Users are policy analysts, compliance and privacy professionals, lawyers, and researchers. The dataset covers laws, decrees, regulations, regulator decisions, circulars, strategies, guidelines, and consultations, classified on three axes: instrument class (legal form), themes (17 categories, 63 subcategories), and lifecycle (consultation, enacted, in force, amended, repealed, superseded).

## Brand character

Official gazette meets modern intelligence dashboard. Authoritative, editorial, restrained. Looks like the work of a policy professional, never like a SaaS template.

Current design language (the baseline; refine rather than discard):

- Light theme: warm paper background (#faf9f5), white surfaces, ink navy text (#1b2742), one terracotta accent (#8c3b2e) used sparingly, amber treatment reserved for compliance deadlines.
- Dark theme: deep navy paper (#10141d), all tokens have dark variants, toggled by a header button, persisted.
- Per-country accent tints used on badges, stamps, and nothing else: SA green, AE ochre, BH red, QA maroon, KW teal, OM blue.
- Type: Fraunces (display: masthead, headings, big numerals), Source Serif 4 (titles in content), IBM Plex Sans (UI and body), IBM Plex Mono (dates, citations, reference numbers, country codes), IBM Plex Sans Arabic (all Arabic text).
- Texture: subtle paper grain overlay, ghosted giant section sign (§) watermark, hairline rules, classic double rule under the masthead, hard offset shadows on dossier panels, gently rotated stamp tiles.
- Motion: one staggered load choreography per page, hover lifts, expand transitions; everything respects prefers-reduced-motion.

## Global chrome

Sticky translucent header: wordmark "Complyr." (Fraunces, terracotta full stop), nav (Home, Dashboard, GitHub), theme toggle pill. Footer: one line project description, licence line (MIT code, CC BY 4.0 data, not legal advice).

## Page: Home (front page of a journal)

1. Masthead: mono uppercase meta rails (project facts, entry counts, coverage window), huge Fraunces headline "GCC regulation, as structured data." with the key phrase in terracotta italic, Arabic subline beneath, double rule that draws in on load.
2. Lede: two paragraphs opening with a terracotta drop cap, beside a bordered "three axes" dossier card with a hard offset shadow (numbered 01 02 03: instrument class, themes, lifecycle).
3. Jurisdiction stamps: six tinted, slightly rotated tiles (country code in Fraunces, name, entry count), each linking to the dashboard pre-filtered to that country; straighten and lift on hover.
4. Latest updates register: lead month as oversized Fraunces heading (month in ink, year in terracotta italic), entries as hairline separated rows with hanging mono dates, jurisdiction badge, instrument type, title, one line summary; earlier months in smaller column groups; link to the dashboard.
5. Notice to contributors: double framed notice box with three numbered steps and the repo link.

## Page: Dashboard (faceted catalogue browser)

Layout: fixed left filter rail plus main results area. On mobile the rail becomes a full screen drawer behind a "Filters (n)" button.

Filter rail, all combinable, all with per-option counts:
- Country: six code chips, multi select
- Category: tree of the 17 categories; selecting one reveals its subcategories indented; radio behaviour; empty categories noted in one muted line, not listed
- Year: chips, multi select
- Authority: radio list, automatically narrowed to authorities from the selected countries (with a note saying so)
- Instrument type, binding status, lifecycle: radio lists

Top bar: search input (searches English and Arabic titles, summaries, tags), sort select (newest, oldest, A to Z), English/Arabic content toggle, Export JSON and Export CSV buttons that download only the currently filtered set.

Below top bar: result count ("12 of 13 instruments"), active filters as removable terracotta chips, clear all. All filter state syncs to the URL so filtered views are shareable links.

Results: responsive card grid. Compact card: country badge (tinted), instrument type pill, year in mono top right, serif title, one line summary, amber compliance deadline flag when upcoming, "Pending verification" pill when applicable. Clicking expands the card to span the full grid width (temporary behaviour until detail pages exist), revealing: full summary, "What this means" impact note, obligations list (party, duty, deadline), applicability grid (applies to, sectors, extraterritorial, penalties, grace period), instrument family tree (enabling law at top, amendments and implementing measures nested beneath with mono relationship labels, current document highlighted), citation in mono with a copy button, source row (gazette details, official link, source confidence, last verified date, Arabic-only-binding-text note).

States to design: empty results, single result, expanded card, Arabic mode (titles, summaries, impact notes flip to RTL with the Arabic typeface while UI chrome stays English), dark theme versions of everything.

## Page to design from scratch: document detail

Each record will get its own page (currently inline expansion). Available content blocks per document: title (EN and AR), official title (EN and AR), jurisdiction, instrument type, binding status, lifecycle, themes, issuing authority (name, mandate, website), dates (issued, effective, compliance deadline), gazette (name, number, date), formatted citation, summary, impact note, obligations, applicability, relationship family, source URL and confidence, last verified, tags. Design should make the impact note and the family hierarchy the stars, carry the gazette character, and handle nullable fields gracefully (many records have no gazette number, no Arabic summary, no obligations).

## Hard constraints

- Static site, no backend; everything client side must stay light and fast.
- Fully responsive; keyboard accessible; visible focus states; reduced motion support.
- Bilingual: correct RTL rendering for Arabic content, IBM Plex Sans Arabic, UI chrome remains English.
- Honest states are part of the design: pending verification flags and source confidence must stay visible, never hidden for polish.
- Never: gradient heroes, floating screenshots, testimonials, stock illustrations, purple SaaS gradients, generic template aesthetics.
- Copy style: sentence case, no dash punctuation, plain professional tone.
