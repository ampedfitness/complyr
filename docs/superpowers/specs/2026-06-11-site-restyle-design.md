# Complyr site restyle design

Date: 2026-06-11. Approved direction: faithful match to the owner's mockup, applied site-wide, by swapping the design system in place.

## Goal

Replace the gazette visual layer with the mockup's modern SaaS language: indigo primary, white cards on a light lavender-grey background, Inter typography, pill badges, soft shadows. No functional changes anywhere.

## 1. Design tokens (src/styles/global.css)

- Primary accent indigo near #5048E5 for links, buttons, active nav, Arabic subline.
- Ink near #18181B on white card surfaces over a #F7F7FB page background; 1px borders near #E8E8F0.
- Status colours: green for high confidence (official), amber for medium (secondary), amber outline for pending verification, grey for informational notes.
- Keep the per-country --jur-* variables but mute them to fit the palette.
- Fonts: Inter for all Latin text (weight 800 with tight tracking for the headline), IBM Plex Sans Arabic for Arabic. Remove Fraunces, Source Serif 4, and the serif stack.
- Shape: 12 to 16px card radii, pill badges, soft diffuse shadows.
- Dark mode stays on the existing [data-theme] mechanism: near-black surfaces, same indigo, lifted borders. The mockup shows light only; dark is a derived variant.

## 2. Homepage (src/pages/index.astro), section for section from the mockup

- Sticky header: rounded-square C logo mark plus wordmark, nav Home / Dashboard / GitHub (external icon), active underline, theme toggle. Deviation from the mockup: no EN dropdown in the header; the EN/AR content toggle stays dashboard-only per the feature brief.
- Hero left: headline "GCC Regulation. Verified. Structured. Open.", indigo Arabic subline, two intro paragraphs.
- Hero right: four stat cards (establishment year, total instruments, authority count, coverage range) computed from data, plus a "How Complyr classifies regulation" panel showing the three axes (instrument class, themes, lifecycle) with icons and one-line explanations.
- Browse by jurisdiction: six tiles with inline SVG flags, country code, full name, live entry count, arrow; each links to the dashboard pre-filtered to that country.
- Latest updates: entries grouped by month of date_issued, newest first, up to four month groups. Newest month expanded as a table: date, flag and code, instrument type badge, title with one-sentence summary, source confidence badge, arrow linking to the record in the dashboard. Older months collapse to a row with month, count, and type-count chips, expandable on click. Confidence mapping: official maps to High (green), secondary to Medium (amber), pending_verification to Pending (amber outline). Legend row beneath; View full dashboard link at top right of the section.
- Contribute panel beside the timeline: three numbered steps (find an issue or instrument, make a change, review and publish) and a Contribute on GitHub button.
- Footer: one-line project description; MIT licence, CC BY 4.0 data, not legal advice.

## 3. Dashboard restyle (CSS only)

Dashboard.tsx, RecordCard.tsx, and FamilyTree.tsx keep all logic untouched: filters, counts, search, sort, URL sync, export, EN/AR toggle, expanding cards. Only styles change: white cards on the lavender-grey background, indigo chips and focus states, and the same type and confidence badges as the homepage.

## 4. Out of scope

Data model, validation, build pipeline, routes, the developments redirect, accessibility behaviours (keyboard, visible focus, reduced motion), and writing rules (no dash punctuation, sentence case) all stay as they are.

## Verification

npm run validate, npm test, npm run build, plus a dev-server visual pass against the mockup in light and dark themes.
