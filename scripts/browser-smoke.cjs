const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const baseUrl = process.env.ARENA_BASE_URL || 'http://127.0.0.1:5174';
const dir = 'artifacts/ui';
fs.mkdirSync(dir, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    channel: process.env.ARENA_BROWSER_CHANNEL || undefined,
    headless: true,
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  async function capture(p, path) {
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.product-card,.purchase-dialog > div')].every(
        (el) => Number(getComputedStyle(el).opacity) > 0.99,
      ),
    );
    await p.screenshot({ path, fullPage: true });
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(baseUrl);
  await page.getByRole('heading', { name: /Can an agent cancel renewal/ }).waitFor();
  await capture(page, `${dir}/home-desktop.png`);
  await page.getByLabel('Scenario', { exact: true }).selectOption('signal-hunt');
  await page.getByRole('button', { name: 'Try the challenge yourself', exact: true }).click();
  await page.getByRole('heading', { name: 'Find your quiet.' }).waitFor();
  await page.getByRole('button', { name: 'Inspect Cloud Nine', exact: true }).click();
  await page.getByRole('button', { name: 'Go to checkout', exact: true }).click();
  await page.getByRole('button', { name: 'Place order · $117', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'just sold out' }).waitFor();
  await capture(page, `${dir}/availability.png`);
  await page.getByRole('button', { name: 'Close checkout', exact: true }).click();
  await page.getByRole('button', { name: 'All headphones', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect Orbit One', exact: true }).click();
  await page.getByRole('button', { name: 'Go to checkout', exact: true }).click();
  await page.getByRole('button', { name: 'Place order · $113', exact: true }).click();
  await page.getByRole('heading', { name: 'You found your way out.', exact: true }).waitFor();
  await page.getByText('6/6', { exact: true }).waitFor();
  await capture(page, `${dir}/scorecard.png`);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download run record', exact: true }).click();
  const download = await downloaded;
  await download.saveAs(`${dir}/human-record.json`);
  const record = JSON.parse(fs.readFileSync(`${dir}/human-record.json`, 'utf8'));
  assert.equal(record.result.correct, true);
  assert.equal(record.result.order.total, 113);
  assert.equal(record.result.recoveries, 1);
  assert.equal(record.recording, 'application-events');
  assert(!JSON.stringify(record).includes('tokenHash'));
  const runId = record.id;
  // A different browser cannot fetch, mutate, reset or export this run.
  const outsider = await browser.newContext();
  const isolated = await outsider.request.get(`${baseUrl}/api/runs/${runId}`);
  assert.equal(isolated.status(), 403);
  await outsider.close();
  await page.getByRole('button', { name: 'Try the same challenge', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect Cloud Nine', exact: true }).waitFor();
  assert(!page.url().includes(runId));
  await capture(page, `${dir}/challenge-desktop.png`);
  await page.getByRole('button', { name: 'Inspect Halo Pro', exact: true }).click();
  await page.getByRole('button', { name: 'Go to checkout', exact: true }).click();
  await page.getByRole('button', { name: 'Place order · $127', exact: true }).click();
  await page
    .getByRole('heading', { name: 'An order. Not quite an escape.', exact: true })
    .waitFor();
  await page.getByText('5/6', { exact: true }).waitFor();
  await capture(page, `${dir}/incorrect.png`);
  await page.reload();
  await page
    .getByRole('heading', { name: 'An order. Not quite an escape.', exact: true })
    .waitFor();
  await page.getByRole('link', { name: 'Human attempts', exact: true }).click();
  await page.getByRole('heading', { name: /Every attempt/ }).waitFor();
  assert.equal(await page.locator('.archive-row').count(), 2);
  await capture(page, `${dir}/archive.png`);
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mp = await mobile.newPage();
  await mp.goto(baseUrl);
  await capture(mp, `${dir}/home-mobile.png`);
  await mp.getByLabel('Scenario', { exact: true }).selectOption('signal-hunt');
  await mp.getByRole('button', { name: 'Try the challenge yourself', exact: true }).click();
  await mp.getByRole('button', { name: 'Inspect Orbit One', exact: true }).waitFor();
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(overflow, false, 'Mobile layout overflows horizontally');
  await capture(mp, `${dir}/challenge-mobile.png`);
  await mp.getByRole('button', { name: 'Inspect Orbit One', exact: true }).click();
  await mp.getByRole('button', { name: 'Go to checkout', exact: true }).click();
  await capture(mp, `${dir}/checkout-mobile.png`);
  await mp.getByRole('button', { name: 'Place order · $113', exact: true }).click();
  await mp.getByRole('heading', { name: 'You found your way out.', exact: true }).waitFor();
  assert.equal(await mp.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: desktop and mobile workflow, sold-out recovery and frictionless checkout, correct and incorrect grading, download, reset, persistence, archive, cross-session isolation, no browser errors.',
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
