// One-off verification for the homepage rework. Run: node scripts/verify-home.mjs
// Screenshots land in .superpowers/verify/. Not part of CI.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = 'http://localhost:4321/complyr/';
const OUT = '.superpowers/verify';
mkdirSync(OUT, { recursive: true });

const widths = [375, 768, 1024, 1440];
const issues = [];

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
});

for (const theme of ['light', 'dark']) {
  for (const width of widths) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      colorScheme: theme === 'dark' ? 'dark' : 'light',
    });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    if (overflow > 1) issues.push(`${theme} ${width}px: horizontal overflow of ${overflow}px`);

    const checks = await page.evaluate(() => {
      const r = {};
      r.searchForm = !!document.querySelector('form.search input[name="q"]');
      r.arabic = !!document.querySelector('.hero-ar');
      r.contributeGone = !document.querySelector('.contribute-card');
      r.filters =
        !!document.querySelector('#f-all') &&
        !!document.querySelector('#f-jur') &&
        !!document.querySelector('#f-cls');
      r.legendCard = !!document.querySelector('.legend-card .legend');
      r.statBand = document.querySelectorAll('.stat-band .stat-cell').length;
      r.jurTiles = document.querySelectorAll('.jur-tile').length;
      r.updatesCard = !!document.querySelector('.updates-card');
      const go = document.querySelector('.search-go');
      r.goSize = go ? Math.round(go.getBoundingClientRect().width) : 0;
      return r;
    });
    if (!checks.searchForm) issues.push(`${theme} ${width}px: search form missing`);
    if (!checks.arabic) issues.push(`${theme} ${width}px: Arabic subline missing`);
    if (!checks.contributeGone) issues.push(`${theme} ${width}px: contribute card still present`);
    if (!checks.filters) issues.push(`${theme} ${width}px: update filters missing`);
    if (!checks.legendCard) issues.push(`${theme} ${width}px: legend sidebar missing`);
    if (checks.statBand !== 4) issues.push(`${theme} ${width}px: expected 4 stat cells, got ${checks.statBand}`);
    if (checks.jurTiles !== 6) issues.push(`${theme} ${width}px: expected 6 tiles, got ${checks.jurTiles}`);
    if (!checks.updatesCard) issues.push(`${theme} ${width}px: updates card missing`);
    if (checks.goSize < 43) issues.push(`${theme} ${width}px: search button ${checks.goSize}px under 44`);

    await page.screenshot({ path: `${OUT}/home-${theme}-${width}.png`, fullPage: true });
    await ctx.close();
  }
}

// Reduced motion: full content, no reveals pending, no cursor ring.
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const rm = await page.evaluate(() => {
    const r = {};
    r.jsReveal = document.documentElement.classList.contains('js-reveal');
    const hero = document.querySelector('.hero h1');
    r.heroOpacity = hero ? getComputedStyle(hero).opacity : 'missing';
    const jur = document.querySelector('.jurisdictions');
    r.jurOpacity = jur ? getComputedStyle(jur).opacity : 'missing';
    const ring = document.getElementById('cursor-ring');
    r.ringHidden = ring ? getComputedStyle(ring).display === 'none' : false;
    return r;
  });
  if (rm.jsReveal) issues.push('reduced motion: js-reveal class should not be set');
  if (rm.heroOpacity !== '1') issues.push(`reduced motion: hero opacity ${rm.heroOpacity}`);
  if (rm.jurOpacity !== '1') issues.push(`reduced motion: jurisdictions opacity ${rm.jurOpacity}`);
  if (!rm.ringHidden) issues.push('reduced motion: cursor ring not hidden');
  await page.screenshot({ path: `${OUT}/home-reduced-motion.png`, fullPage: true });
  await ctx.close();
}

// Keyboard: / focuses search, typing / inside the input does not refocus or block.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.keyboard.press('/');
  const focused = await page.evaluate(() => document.activeElement?.id);
  if (focused !== 'home-search') issues.push(`keyboard: / focused ${focused ?? 'nothing'}`);
  await page.keyboard.type('data/privacy');
  const value = await page.evaluate(
    () => document.querySelector('#home-search')?.value
  );
  if (value !== 'data/privacy') issues.push(`keyboard: typing / in input gave value "${value}"`);

  // scroll reveal: updates card becomes visible after scrolling down
  await page.mouse.wheel(0, 4000);
  await page.waitForTimeout(900);
  const revealed = await page.evaluate(() => {
    const z = document.querySelector('.updates-zone');
    return z ? z.classList.contains('shown') && getComputedStyle(z).opacity === '1' : false;
  });
  if (!revealed) issues.push('scroll: updates zone did not reveal');

  // cursor ring appears on pointer move on a fine pointer context
  await page.mouse.move(400, 300);
  await page.waitForTimeout(300);
  const ringOn = await page.evaluate(() => {
    const ring = document.getElementById('cursor-ring');
    return ring ? ring.classList.contains('on') && getComputedStyle(ring).opacity !== '0' : false;
  });
  if (!ringOn) issues.push('cursor: ring did not activate on pointer move');
  await ctx.close();
}

await browser.close();

if (issues.length) {
  console.log('ISSUES:');
  for (const i of issues) console.log(' -', i);
  process.exit(1);
}
console.log('All homepage verification checks passed.');
