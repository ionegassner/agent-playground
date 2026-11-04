/** Verifies the deliverable from file:// with every network request blocked. No inference. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel:
      process.env.ARENA_BROWSER_CHANNEL || (process.platform === 'darwin' ? 'chrome' : undefined),
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [],
      requests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await context.route(/^https?:/, (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    await page.goto(pathToFileURL(path.resolve('release/agent-playground-demo.html')).href);
    await page
      .getByRole('heading', { name: 'Did the agent actually finish the task?', exact: true })
      .waitFor();
    assert.equal(await page.locator('.example-card').count(), 3);
    assert.equal(
      await page.getByRole('button', { name: 'Run comparison', exact: true }).count(),
      0,
    );
    assert.equal(await page.getByText('Your comparisons', { exact: true }).count(), 0);
    await page.getByRole('link', { name: 'Watch stock recovery', exact: true }).click();
    await page
      .getByRole('heading', { name: 'What happens when the first choice sells out?', exact: true })
      .waitFor();
    await page.getByText('AGENT INSTRUCTION PROFILES', { exact: true }).waitFor();
    assert(await page.getByText('Profile A', { exact: true }).isVisible());
    assert(await page.getByText('Profile B', { exact: true }).isVisible());
    await page.getByRole('button', { name: 'Play replay', exact: true }).click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('video')].every(
        (video) => video.readyState >= 2 && video.currentTime > 0.5,
      ),
    );
    await page.getByRole('button', { name: 'Pause replay', exact: true }).click();
    await page.getByRole('button', { name: 'Enlarge contestant A', exact: true }).click();
    await page.getByRole('button', { name: 'Jump to the obstacle', exact: true }).click();
    assert(Number(await page.getByLabel('Replay position', { exact: true }).inputValue()) > 0);
    await page.getByText('Explore the recorded actions', { exact: true }).click();
    await page.getByRole('button', { name: 'B: Alternative committed', exact: true }).click();
    assert.equal(
      await page.getByRole('region', { name: 'Contestant B', exact: true }).isVisible(),
      true,
    );
    assert.equal(
      await page.getByRole('region', { name: 'Contestant A', exact: true }).isVisible(),
      false,
    );
    await page.getByText('Reveal verified results', { exact: true }).click();
    assert.equal(await page.getByText('✓ Correct completion', { exact: true }).count(), 2);
    await page.getByLabel('Playback speed', { exact: true }).selectOption('2');
    await page.getByRole('button', { name: 'Show both contestants', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    const before = await page.getByLabel('Replay position', { exact: true }).inputValue();
    await page.getByRole('button', { name: /Watch A/ }).click();
    await page.getByRole('button', { name: /Watch B/ }).click();
    assert.equal(await page.getByLabel('Replay position', { exact: true }).inputValue(), before);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('link', { name: 'Trial evidence', exact: true }).click();
    await page.getByRole('table', { name: 'All three paired outcomes', exact: true }).waitFor();
    const download = page.waitForEvent('download');
    await page
      .getByRole('link', { name: 'Download all trial evidence (JSON)', exact: true })
      .click();
    const file = await (await download).path();
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).trials.length, 3);
    await page.getByRole('link', { name: 'Agent Playground home', exact: true }).click();
    await page.getByRole('link', { name: /SCRIPTED GRADER DEMO Does completing checkout/ }).click();
    await page.getByText('Explore the recorded actions', { exact: true }).click();
    await page.getByRole('button', { name: 'B: Confirm order', exact: true }).click();
    await page.getByText('Reveal verified results', { exact: true }).click();
    await page.getByText('× Requirements missed', { exact: true }).waitFor();
    assert.equal(await page.getByText('No model usage', { exact: false }).count(), 2);
    await page.getByRole('link', { name: 'About', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Actions, evidence and outcomes.', exact: true })
      .waitFor();
    await page.getByRole('link', { name: 'Agent Playground home', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 960 });
    fs.mkdirSync('artifacts/ui', { recursive: true });
    await page.screenshot({ path: 'artifacts/ui/standalone-demo.png', fullPage: true });
    assert.deepEqual(requests, [], 'Offline demo attempted network access');
    assert.deepEqual(errors, [], 'Offline demo raised browser errors');
    console.log(
      'PASS: standalone file opens, plays and seeks videos, switches contestants, reveals results, downloads evidence and fits mobile with zero network requests. No server or inference.',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
