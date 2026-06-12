# Search-first homepage implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the homepage into a centered search-first hero, remove the contribute section everywhere, and add a restrained motion system plus a desktop cursor ring, per `docs/superpowers/specs/2026-06-12-homepage-search-hero-design.md`.

**Architecture:** All structural work happens in `src/pages/index.astro` (markup, scoped styles, two small scripts). The cursor ring is site wide, so its element and script live in `src/layouts/Base.astro` with styles in `src/styles/global.css`. Two copy cleanups land in `src/components/Dashboard.tsx` and `README.md`. No data or logic changes.

**Tech stack:** Astro 6 static pages, vanilla CSS with custom properties, no new dependencies. Verification is `npm run validate`, `npm test`, `npm run build` plus a visual pass (there are no unit tests for page markup in this repo).

**Writing rules:** all copy follows repo rules, no em dashes or dash punctuation, sentence case.

---

### Task 1: Rework index.astro

**Files:**
- Modify: `src/pages/index.astro` (frontmatter, template lines 124 to 383, style block)

- [ ] **Step 1: Add the chips array to the frontmatter**

After the `legend` const (around line 121), add:

```ts
const chips = [
  { label: 'AI governance', href: `${base}dashboard/?l=ai_emerging_tech.ai_governance_ethics` },
  { label: 'Personal data protection', href: `${base}dashboard/?l=data_privacy.personal_data_protection` },
  { label: 'Cybersecurity', href: `${base}dashboard/?b=cybersecurity` },
  { label: 'Digital finance', href: `${base}dashboard/?b=digital_finance` },
];
```

Everything else in the frontmatter stays (statCards, axes, legend, groups).

- [ ] **Step 2: Replace the hero section markup**

Replace the current `<section class="hero">…</section>` (lines 129 to 176, the whole hero-copy and hero-side grid) with:

```astro
    <script is:inline>
      if (
        'IntersectionObserver' in window &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        document.documentElement.classList.add('js-reveal');
      }
    </script>
    <section class="hero">
      <h1 class="reveal">GCC Digital Regulation. Verified. Structured.&nbsp;Open.</h1>
      <p class="hero-lede reveal d1">
        A structured, source-verified register of digital regulatory instruments across Bahrain,
        Saudi Arabia, UAE, Qatar, Kuwait, and Oman.
      </p>
      <form class="search reveal d2" role="search" action={`${base}dashboard/`} method="get">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="home-search"
          type="search"
          name="q"
          placeholder="Search laws, regulations, strategies across the GCC…"
          aria-label="Search the register"
          enterkeyhint="search"
          autocomplete="off"
        />
        <span class="kbd" aria-hidden="true">/</span>
        <button class="search-go" type="submit" aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
      <div class="chips reveal d3">
        {chips.map((c) => <a class="chip" href={c.href}>{c.label}</a>)}
      </div>
    </section>

    <div class="stat-row reveal d4">
      {
        statCards.map((s) => (
          <div class="stat-card">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d={s.icon} />
            </svg>
            <span class="stat-label">{s.label}</span>
            <span class="stat-value">{s.value}</span>
          </div>
        ))
      }
    </div>

    <div class="classify reveal d5">
      <h2>How Complyr classifies regulation</h2>
      <div class="classify-axes">
        {
          axes.map((a) => (
            <div class="axis">
              <svg class="axis-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d={a.icon} />
              </svg>
              <span class="axis-name">{a.name}</span>
              <span class="axis-desc">{a.desc}</span>
            </div>
          ))
        }
      </div>
    </div>
```

The stat card and axis inner markup is identical to today, only the wrappers and reveal classes change.

- [ ] **Step 3: Update the jurisdictions and updates sections**

- On `<section class="jurisdictions reveal d2" …>` change the class to `jurisdictions` and add `data-reveal`: `<section class="jurisdictions" data-reveal aria-label="Jurisdictions">`. Inner markup unchanged.
- On `<section class="updates-zone">` add `data-reveal`.
- On `<div class="updates-card reveal d3">` change the class to just `updates-card`.
- Delete the whole `<aside class="contribute-card reveal d4">…</aside>` block (lines 345 to 380).

- [ ] **Step 4: Add the page scripts**

After the closing `</Base>` tag, before the `<style>` block, add:

```astro
<script>
  const search = document.getElementById('home-search');
  window.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    search?.focus();
  });

  const targets = document.querySelectorAll('[data-reveal]');
  if (document.documentElement.classList.contains('js-reveal')) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('shown');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    targets.forEach((el) => io.observe(el));
  }
</script>
```

With no JavaScript the `js-reveal` class never appears, so sections render visible.

- [ ] **Step 5: Rework the styles**

In the `<style>` block:

Delete these rules entirely: `.hero` (grid version), `.hero-copy h1`, `.hero-ar`, `.contribute-card h2`, `.contribute-lede`, `.steps`, `.steps::before`, `.steps li`, `.step-num`, `:root[data-theme='dark'] .step-num`, `.step-name`, `.step-desc`, `.gh-btn`, `.gh-btn:hover`, `.gh-btn svg`. In the shared rule `.updates-card, .contribute-card { … }` drop the `.contribute-card` selector. In the 70rem media query delete the `.hero { grid-template-columns: 1fr; gap: 2rem; }` and `.updates-zone { grid-template-columns: 1fr; }` rules. In the 46rem media query delete the `.hero-copy h1` rule.

Replace `.updates-zone` with:

```css
  .updates-zone {
    display: block;
  }
```

Replace `.hero-lede` and add the new hero zone styles where the old hero styles sat:

```css
  .hero {
    position: relative;
    max-width: 46rem;
    margin: 1.4rem auto 0;
    display: grid;
    gap: 1.15rem;
    justify-items: center;
    text-align: center;
  }

  .hero::before {
    content: '';
    position: absolute;
    inset: -30% -20% auto;
    height: 150%;
    background: radial-gradient(
      40rem 20rem at 50% 32%,
      color-mix(in srgb, var(--accent) 9%, transparent),
      transparent 70%
    );
    pointer-events: none;
    z-index: -1;
  }

  .hero h1 {
    font-size: clamp(2.2rem, 5vw, 3.3rem);
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 1.06;
    margin: 0;
  }

  .hero-lede {
    font-size: 1rem;
    line-height: 1.7;
    color: var(--ink-soft);
    margin: 0;
    max-width: 36rem;
  }

  .search {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    width: 100%;
    max-width: 38rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 999px;
    box-shadow: var(--shadow);
    padding: 0.3rem 0.3rem 0.3rem 1.15rem;
    transition: border-color 160ms ease, box-shadow 200ms ease;
  }

  .search:focus-within {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--line));
    box-shadow: 0 0 0 4px var(--accent-soft), var(--shadow-lift);
  }

  .search-icon {
    width: 1.1rem;
    height: 1.1rem;
    color: var(--accent);
    flex-shrink: 0;
  }

  .search input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 0.95rem;
    color: var(--ink);
    padding: 0.55rem 0;
  }

  .search input::placeholder {
    color: var(--ink-faint);
  }

  .search input:focus {
    outline: none;
  }

  .kbd {
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--ink-faint);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0.1rem 0.45rem;
    background: var(--paper);
    flex-shrink: 0;
  }

  .search-go {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    border: 0;
    border-radius: 999px;
    background: var(--accent);
    color: #ffffff;
    cursor: pointer;
  }

  .search-go:hover {
    background: var(--accent-strong);
  }

  .search-go svg {
    width: 1.1rem;
    height: 1.1rem;
  }

  :root[data-theme='dark'] .search-go {
    color: #0f0f17;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    padding: 0.3rem 1.05rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--accent);
    background: var(--accent-soft);
    border-radius: 999px;
  }

  .chip:hover {
    text-decoration: none;
    background: color-mix(in srgb, var(--accent) 14%, var(--accent-soft));
    transform: translateY(-1px);
  }

  @media (hover: none) {
    .kbd {
      display: none;
    }
  }
```

Adjust `.stat-row` and `.classify` to centered widths (keep their card and axis child rules as they are):

```css
  .stat-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.9rem;
    max-width: 54rem;
    margin: 2.4rem auto 0;
  }

  .classify {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--r);
    box-shadow: var(--shadow);
    padding: 1.2rem 1.4rem 1.35rem;
    max-width: 54rem;
    margin: 0.9rem auto 0;
  }
```

In the load choreography media query, add `d5` and the new motion rules:

```css
  @media (prefers-reduced-motion: no-preference) {
    .reveal {
      opacity: 0;
      animation: rise 0.55s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
    }

    .d1 { animation-delay: 0.07s; }
    .d2 { animation-delay: 0.14s; }
    .d3 { animation-delay: 0.21s; }
    .d4 { animation-delay: 0.3s; }
    .d5 { animation-delay: 0.38s; }

    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(14px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    .hero::before {
      animation: glow-drift 36s ease-in-out infinite alternate;
    }

    @keyframes glow-drift {
      from {
        transform: translate3d(-4%, 0, 0);
      }
      to {
        transform: translate3d(4%, 2.5%, 0);
      }
    }

    :root.js-reveal [data-reveal] {
      opacity: 0;
      transform: translateY(18px);
      transition:
        opacity 480ms cubic-bezier(0.2, 0.7, 0.3, 1),
        transform 480ms cubic-bezier(0.2, 0.7, 0.3, 1);
    }

    :root.js-reveal [data-reveal].shown {
      opacity: 1;
      transform: none;
    }

    .jur-tile:active,
    .chip:active,
    a.update-row:active {
      transform: scale(0.985);
    }
  }
```

- [ ] **Step 6: Build and verify**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: search-first centered hero, contribute panel removed"
```

### Task 2: Cursor ring and smooth scroll

**Files:**
- Modify: `src/layouts/Base.astro` (before the closing body tag)
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add the ring element and script to Base.astro**

Before the existing theme toggle `<script>` near the end of the body, add:

```astro
    <div id="cursor-ring" aria-hidden="true"></div>
    <script>
      const ring = document.getElementById('cursor-ring');
      if (
        ring &&
        matchMedia('(hover: hover) and (pointer: fine)').matches &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        let x = -100;
        let y = -100;
        let rx = -100;
        let ry = -100;
        let scale = 1;
        let raf = 0;
        const tick = () => {
          rx += (x - rx) * 0.16;
          ry += (y - ry) * 0.16;
          ring.style.transform = `translate3d(${rx - 19}px, ${ry - 19}px, 0) scale(${scale})`;
          raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.2 ? requestAnimationFrame(tick) : 0;
        };
        const wake = () => {
          if (!raf) raf = requestAnimationFrame(tick);
        };
        window.addEventListener(
          'pointermove',
          (e) => {
            x = e.clientX;
            y = e.clientY;
            ring.classList.add('on');
            wake();
          },
          { passive: true }
        );
        window.addEventListener(
          'pointerover',
          (e) => {
            const t = e.target;
            scale =
              t instanceof Element && t.closest('a, button, input, select, summary, [role="button"]')
                ? 1.55
                : 1;
            wake();
          },
          { passive: true }
        );
        document.documentElement.addEventListener('pointerleave', () => {
          ring.classList.remove('on');
        });
      }
    </script>
```

- [ ] **Step 2: Add ring styles and smooth scroll to global.css**

At the end of `global.css` add:

```css
#cursor-ring {
  position: fixed;
  top: 0;
  left: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--accent) 55%, transparent);
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--accent) 14%, transparent),
    transparent 72%
  );
  pointer-events: none;
  z-index: 2000;
  opacity: 0;
  transition: opacity 200ms ease;
  will-change: transform;
}

#cursor-ring.on {
  opacity: 1;
}

@media (hover: none), (pointer: coarse), (prefers-reduced-motion: reduce) {
  #cursor-ring {
    display: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  html {
    scroll-behavior: smooth;
  }
}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/Base.astro src/styles/global.css
git commit -m "feat: desktop cursor ring and smooth anchor scrolling"
```

### Task 3: Contribute copy cleanups

**Files:**
- Modify: `src/components/Dashboard.tsx:521-524`
- Modify: `README.md:96-103`

- [ ] **Step 1: Reword the dashboard empty state**

Replace:

```tsx
            No instruments match the current filters. Clear a filter or two, or contribute the
            missing instrument on GitHub.
```

with:

```tsx
            No instruments match the current filters. Clear a filter or two, or try a different
            search.
```

- [ ] **Step 2: Reframe the README section**

Change the heading `## Contributing an entry` to `## Adding an entry`, and change step 6 from:

```
6. Run `npm run validate` and fix what it reports, then open a pull request.
```

to:

```
6. Run `npm run validate` and fix what it reports, then commit.
```

- [ ] **Step 3: Validate, test, build**

Run: `npm run validate && npm test && npm run build`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/Dashboard.tsx README.md
git commit -m "chore: neutral empty state and maintainer voice for entry docs"
```

### Task 4: Verification pass

**Files:** none (verification only, plus fixes if anything fails)

- [ ] **Step 1: Full check suite**

Run: `npm run validate && npm test && npm run build`
Expected: all pass.

- [ ] **Step 2: Visual pass**

Start `npm run dev`. Screenshot the homepage via CDP device emulation (per CLAUDE.md, do not trust raw headless window size) at 375, 768, 1024, and 1440px wide, in light and dark themes. Confirm: centered hero with search and chips, no Arabic subline, stat row and classification band centered, flag tiles intact, updates full width, no contribute panel, no horizontal overflow at 375px.

- [ ] **Step 3: Reduced motion and keyboard pass**

- Emulate `prefers-reduced-motion: reduce` via CDP: page renders fully with no reveals, no glow drift, no cursor ring.
- Keyboard: `/` focuses search (and does not fire while typing in the search box itself), tab order goes header, search, chips, tiles, updates rows, focus rings visible.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix: homepage polish issues found in verification"
```

Only if fixes were needed.
