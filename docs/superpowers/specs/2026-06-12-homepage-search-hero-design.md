# Homepage search hero and contribute removal

Date: 2026-06-12. Status: approved by owner in brainstorming session.

## Context and goals

The digital regulation refocus shipped (taxonomy v2.0.0, retagged records, updated copy). The owner wants the homepage reworked to act as a front door into the register rather than a brochure, the contribute section removed because he manages the dataset himself, and a polish pass that brings the page to flagship quality while maximising user comfort. The indigo SaaS design language stays unchanged; this rework rearranges and elevates, it does not restyle.

## Scope

In scope: `src/pages/index.astro` (structure, copy, styles, motion), small additions to `src/styles/global.css` (shared motion tokens, cursor ring), one copy line in `src/components/Dashboard.tsx`, one heading in `README.md`.

Out of scope: dashboard logic, data model, per document detail pages, header and footer, dark mode token values.

## Page structure, top to bottom

1. Centered hero
2. Stat card row
3. Classification band
4. Browse by jurisdiction (unchanged)
5. Latest updates, full width

### 1. Centered hero

A single centered column, max width about 46rem:

- H1: "GCC Digital Regulation. Verified. Structured. Open." The Arabic subline is removed entirely (delete the `hero-ar` element and styles).
- One short lede line beneath: "A structured, source-verified register of digital regulatory instruments across Bahrain, Saudi Arabia, UAE, Qatar, Kuwait, and Oman."
- Search bar: a pill shaped form, `role="search"`, a plain GET form with `action={base + 'dashboard/'}` and an input named `q`. Submitting navigates to the dashboard, which already reads `q` from the URL. No client side search logic on the homepage.
  - Placeholder: "Search laws, regulations, strategies across the GCC…"
  - A visible `/` keyboard hint badge inside the bar on the right. A small inline script focuses the input when `/` is pressed outside an input or textarea.
  - Focus state: soft indigo ring bloom on focus (box shadow transition, 200ms).
- Suggested topic chips beneath the search bar, four anchors deep linking into existing dashboard filters:
  - AI governance: `dashboard/?l=ai_emerging_tech.ai_governance_ethics`
  - Personal data protection: `dashboard/?l=data_privacy.personal_data_protection`
  - Cybersecurity: `dashboard/?b=cybersecurity`
  - Digital finance: `dashboard/?b=digital_finance`
  - Chips keep the existing pill style (accent on accent-soft), minimum 44px touch target via padding, `cursor: pointer`.
- Ambient depth: a soft indigo radial gradient glow behind the hero, very low opacity, drifting slowly (a single transform animation over tens of seconds). Pure decoration on a non interactive pseudo element, removed under reduced motion.

### 2. Stat card row

The four existing stat cards (Est. year, Total instruments, Authorities, Coverage) in a centered row below the hero, max width about 54rem. Same card styles as today.

### 3. Classification band

The existing three axis classification panel becomes a horizontal band card below the stats, same max width, same content (instrument class, themes, lifecycle) with the existing icons. On mobile it stacks vertically as it does today.

### 4. Browse by jurisdiction

Unchanged: the six flag tiles with counts, hover lift, per country links into the dashboard.

### 5. Latest updates

The existing timeline card (newest month table, older months as details rows, confidence legend) takes the full content width. The `updates-zone` two column grid and the entire `contribute-card` aside are deleted, along with their styles.

## Contribute removal cleanups

- `src/pages/index.astro`: delete the contribute aside, steps list, GitHub button, and all `.contribute-*`, `.steps`, `.step-*`, `.gh-btn` styles.
- `src/components/Dashboard.tsx` empty state: reword "Clear a filter or two, or contribute the missing instrument" to neutral copy such as "Clear a filter or two, or try a different search." No logic changes.
- `README.md`: rename the "Contributing an entry" section to "Adding an entry" and adjust its intro to read as maintainer documentation rather than a public call for contributions. The procedure content stays, it documents the pipeline.
- The GitHub link in the header nav and the footer licence line stay; the project remains open source.

## Motion system

Shared rules, applied consistently:

- Transform and opacity only, no width, height, or position animation, so there is no layout shift.
- Enter: ease-out. Exit: ease-in. Micro interactions 150 to 200ms, reveals 350 to 400ms, nothing over 500ms except the ambient glow drift.
- Everything sits behind `@media (prefers-reduced-motion: no-preference)`. Reduced motion users get the complete page instantly with no reveals, no glow drift, no cursor ring.

Specifics:

- Load choreography: hero children (H1, lede, search, chips) rise and fade in sequence with 60 to 80ms stagger, then the stat row and classification band follow. Replaces the current `.reveal .d1 .d4` delays.
- Scroll reveals: jurisdiction section and updates card start hidden and rise into place when they enter the viewport, via a small IntersectionObserver script with `once` semantics (unobserve after reveal). Elements above the fold never wait for the observer. With JavaScript disabled the content must remain visible (apply the hidden state only when a `js` class is present on the root).
- Micro interactions: existing tile and row hovers tuned to 150 to 200ms; tappable cards get a subtle pressed scale around 0.98.

## Cursor ring (desktop only)

The native cursor is never hidden or replaced. A small indigo glow ring follows the pointer with a slight ease lag, enlarging gently over interactive elements (links, buttons, inputs). Implementation:

- A single fixed position element animated with transform, `pointer-events: none`, behind no content (high z-index but non interactive).
- Enabled only when `(hover: hover) and (pointer: fine)` matches, so touch devices never see it.
- Disabled under reduced motion.
- Colour from `var(--accent)` at low opacity so it works in both themes.

## Comfort and accessibility checklist (acceptance criteria)

- Search input has a visible label for assistive tech (`aria-label` plus the visible placeholder) and the form is keyboard submittable.
- The `/` shortcut never fires while typing in an input, textarea, or contenteditable.
- Focus visible on every interactive element including chips and the search input.
- Touch targets at least 44px for chips and search submit.
- Text contrast at least 4.5:1 for body text in both themes, verified for all new elements.
- No cumulative layout shift from fonts, reveals, or the glow (reveals animate transform and opacity only; space is always reserved).
- `scroll-behavior: smooth` for anchor navigation, inside the reduced motion guard.
- Heading hierarchy stays sequential (h1 hero, h2 section titles, h3 month blocks).

## Verification

- `npm run validate`, `npm test`, `npm run build` all pass.
- Visual pass in light and dark themes at 375px, 768px, 1024px, 1440px.
- Reduced motion pass: emulate `prefers-reduced-motion: reduce` and confirm full content with zero animation and no cursor ring.
- Keyboard pass: tab through the page, confirm focus order and the `/` shortcut.
- Per CLAUDE.md, trust CDP device emulation over headless window size when checking responsive behaviour.

## Writing rules reminder

All new copy follows the repo rules: no em dashes or dash punctuation, sentence case, active voice, plain professional tone.
