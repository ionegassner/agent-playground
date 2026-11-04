/** Fresh-database production acceptance check; no inference or existing user data. */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync, mkdirSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const folder = mkdtempSync(path.join(tmpdir(), 'arena-portfolio-'));
const base = 'http://127.0.0.1:3020';
const child = spawn(process.execPath, ['server/index.ts'], {
  env: { ...process.env, PORT: '3020', DATA_DIR: folder },
  stdio: 'ignore',
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  let browser;
  try {
    const deadline = Date.now() + 10000;
    while (true) {
      try {
        if ((await fetch(base + '/api/health')).ok) break;
      } catch {}
      if (Date.now() > deadline) throw Error('Production fixture failed to start.');
      await delay(100);
    }
    browser = await chromium.launch({
      headless: true,
      channel:
        process.env.ARENA_BROWSER_CHANNEL || (process.platform === 'darwin' ? 'chrome' : undefined),
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    mkdirSync('artifacts/ui', { recursive: true });
    await page.goto(base);
    await page
      .getByRole('heading', { name: 'Pick a question. Watch it unfold.', exact: true })
      .waitFor();
    assert.equal(await page.locator('.example-card').count(), 3);
    assert.deepEqual(await (await page.request.get(base + '/api/matches')).json(), []);
    await page.screenshot({ path: 'artifacts/ui/portfolio-home.png', fullPage: true });
    const evidenceResponse = await page.request.get(base + '/experiments/strategy-trials.json');
    assert.equal(evidenceResponse.status(), 200);
    assert(evidenceResponse.headers()['content-type'].includes('application/json'));
    const evidence = await evidenceResponse.json();
    await page
      .getByRole('link', { name: 'Read all three trials and their evidence →', exact: true })
      .click();
    await page
      .getByRole('heading', { name: 'Controlled strategy trial evidence', exact: true })
      .waitFor();
    await page.getByRole('table', { name: 'All three paired outcomes', exact: true }).waitFor();
    assert.deepEqual(await page.locator('.trial-table tbody tr').allTextContents(), [
      '120 actions8 actionsBoth correct',
      '218 actions8 actionsBoth correct',
      '318 actions8 actionsBoth correct',
    ]);
    const downloadedEvidence = page.waitForEvent('download');
    await page
      .getByRole('link', { name: 'Download all trial evidence (JSON)', exact: true })
      .click();
    const trialDownload = await downloadedEvidence;
    const trialFile = path.join(folder, 'downloaded-trials.json');
    await trialDownload.saveAs(trialFile);
    assert.deepEqual(JSON.parse(readFileSync(trialFile, 'utf8')), evidence);
    await page.reload();
    await page
      .getByRole('heading', { name: 'Controlled strategy trial evidence', exact: true })
      .waitFor();
    await page.getByRole('table', { name: 'All three paired outcomes', exact: true }).waitFor();
    await page.goto(base + '/#/');
    // Older/custom drafts must keep their text and get a truthful, generic question.
    await page.getByLabel('Scenario', { exact: true }).selectOption('stock-recovery');
    await page.getByText('Advanced settings', { exact: true }).click();
    await page.getByLabel('Scenario seed', { exact: true }).fill('37');
    await page.getByLabel('Shared action limit', { exact: true }).selectOption('8');
    await page.getByLabel('Shared time limit', { exact: true }).selectOption('60000');
    await page.getByLabel('Recent actions retained', { exact: true }).first().selectOption('2');

    await page
      .getByLabel('Task instructions', { exact: true })
      .first()
      .fill('My saved custom approach.');
    await page
      .getByText('How do these two strategies approach the same mission?', { exact: true })
      .waitFor();
    await page.goto(base + '/#/experiment');
    await page.goto(base + '/#/');
    assert.equal(
      await page.getByLabel('Task instructions', { exact: true }).first().inputValue(),
      'My saved custom approach.',
    );
    await page.reload();
    assert.equal(
      await page.getByLabel('Task instructions', { exact: true }).first().inputValue(),
      'My saved custom approach.',
    );
    await page.getByRole('button', { name: 'Load experiment strategies', exact: true }).click();
    await page.getByText(evidence.question, { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel('Scenario', { exact: true }).inputValue(),
      evidence.scenarioId,
    );
    assert.deepEqual(
      await page
        .getByLabel('Task instructions', { exact: true })
        .evaluateAll((inputs) => inputs.map((input) => input.value)),
      evidence.configs.map((c) => c.instructions),
    );

    assert.equal(await page.getByLabel('Model', { exact: true }).first().isVisible(), false);
    await page.getByText('Advanced settings', { exact: true }).click();
    assert.equal(await page.getByLabel('Model', { exact: true }).first().isVisible(), true);
    assert.equal(await page.getByLabel('Scenario seed', { exact: true }).inputValue(), '1');
    assert.equal(await page.getByLabel('Shared action limit', { exact: true }).inputValue(), '24');
    assert.equal(
      await page.getByLabel('Shared time limit', { exact: true }).inputValue(),
      '180000',
    );
    assert.deepEqual(
      await page
        .getByLabel('Recent actions retained', { exact: true })
        .evaluateAll((inputs) => inputs.map((input) => input.value)),
      ['12', '12'],
    );

    await page.locator('a[href="#/example/cancel-renewal"]').click();
    assert.equal(await page.locator('.result-reveal').getAttribute('open'), null);
    assert.equal(
      await page.getByText('✓ Correct completion', { exact: true }).first().isVisible(),
      false,
    );
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('.episode-browser video')].length === 2 &&
        [...document.querySelectorAll('.episode-browser video')].every((v) => v.readyState >= 2),
    );
    await page.screenshot({ path: 'artifacts/ui/portfolio-replay-intro.png', fullPage: true });
    await page.getByRole('button', { name: 'Enlarge contestant A', exact: true }).click();
    // A contestant-specific checkpoint and event must transfer desktop enlargement too.
    await page.getByText('Explore the recorded actions', { exact: true }).click();
    await page.getByRole('button', { name: 'B: Confirm renewal off', exact: true }).click();
    assert.equal(
      await page.getByRole('region', { name: 'Contestant A', exact: true }).isVisible(),
      false,
    );
    assert.equal(
      await page.getByRole('region', { name: 'Contestant B', exact: true }).isVisible(),
      true,
    );
    const cancellation = await (
      await page.request.get(base + '/examples/cancel-renewal/replay.json')
    ).json();
    assert.equal(
      Number(await page.getByLabel('Replay position', { exact: true }).inputValue()),
      cancellation.match.contestants[1].steps.at(-1).elapsedMs,
    );
    await page.getByRole('button', { name: 'A: Retention offer declined', exact: true }).click();
    assert.equal(
      await page.getByRole('region', { name: 'Contestant A', exact: true }).isVisible(),
      true,
    );
    await page.getByRole('button', { name: 'Jump to the obstacle', exact: true }).click();
    const presentedEvent = cancellation.match.contestants[0].events.find(
      (e) => e.type === 'renewal_opened',
    );
    const firstOfferStep = cancellation.match.contestants[0].steps.find(
      (s) =>
        s.action !== 'start' &&
        s.elapsedMs >=
          presentedEvent.elapsedMs + (cancellation.match.contestants[0].eventOffsetMs || 0),
    );
    assert.equal(
      Number(await page.getByLabel('Replay position', { exact: true }).inputValue()),
      firstOfferStep.elapsedMs,
    );
    assert.equal(
      await page
        .getByRole('button', { name: 'A: Retention offer presented', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    );
    const bar = await page
      .getByRole('group', { name: 'Shared replay controls', exact: true })
      .boundingBox();
    const panel = await page
      .getByRole('region', { name: 'Contestant A', exact: true })
      .boundingBox();
    assert(
      bar.y + bar.height <= panel.y,
      'Playback controls must precede enlarged recording without overlap.',
    );
    await page.getByText('Explore the recorded actions', { exact: true }).click();

    await page.screenshot({ path: 'artifacts/ui/portfolio-enlarged.png', fullPage: true });
    assert.equal(await page.locator('.contestant-slot').nth(1).isVisible(), false);
    await page.getByRole('button', { name: 'Show both contestants', exact: true }).click();
    assert.equal(await page.locator('.contestant-slot').nth(1).isVisible(), true);
    await page.getByLabel('Play replay', { exact: true }).click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('video')].every((v) => v.currentTime > 1 && !v.paused),
    );
    await page.getByLabel('Pause replay', { exact: true }).click();
    await page.getByText('Explore the recorded actions', { exact: true }).click();
    await page.getByRole('button', { name: 'A: Renewal turned off', exact: true }).click();
    await page.getByText('Reveal verified results', { exact: true }).click();
    await page
      .getByRole('region', { name: 'Result A', exact: true })
      .getByText('✓ Correct completion', { exact: true })
      .waitFor();
    const range = await page.request.get(base + '/examples/cancel-renewal/0/browser.webm', {
      headers: { Range: 'bytes=100-199' },
    });
    assert.equal(range.status(), 206);
    assert.equal((await range.body()).length, 100);
    await page.screenshot({ path: 'artifacts/ui/portfolio-replay.png', fullPage: true });
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.reject(Error('Unavailable')) },
        configurable: true,
      }),
    );
    await page.getByRole('button', { name: 'Copy comparison link', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Could not copy automatically' }).waitFor();
    await page.goto(base + '/#/example/grader-failure');
    await page.getByText('SCRIPTED GRADER DEMO · NO MODEL CALLS', { exact: true }).waitFor();
    await page.getByText('Explore the recorded actions', { exact: true }).click();
    await page.getByRole('button', { name: 'B: Confirm order', exact: true }).click();
    await page.getByText('Reveal verified results', { exact: true }).click();
    await page
      .getByRole('region', { name: 'Result B', exact: true })
      .getByText('× Requirements missed', { exact: true })
      .waitFor();
    assert.equal(await page.getByText('No model usage', { exact: false }).count(), 2);
    await page.goto(base + '/#/match/00000000-0000-0000-0000-000000000000');
    await page.getByRole('heading', { name: 'This replay is unavailable.', exact: true }).waitFor();
    await page.goto(base + '/#/example/does-not-exist');
    await page.getByRole('heading', { name: 'This replay is unavailable.', exact: true }).waitFor();
    // Missing media falls back to action snapshots without blocking playback.
    await page.route('**/examples/cancel-renewal/*/browser.webm*', (route) => route.abort());
    await page.goto(base + '/#/example/cancel-renewal');
    await page
      .getByText('Browser video unavailable. Showing recorded action snapshots.', { exact: true })
      .first()
      .waitFor();
    await page.getByLabel('Play replay', { exact: true }).click();
    assert.equal(await page.locator('.episode-browser img').count(), 2);
    await page.unroute('**/examples/cancel-renewal/*/browser.webm*');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(base);
    await page
      .getByRole('heading', { name: 'Pick a question. Watch it unfold.', exact: true })
      .waitFor();
    const logo = await page
      .getByRole('link', { name: 'Agent Playground home', exact: true })
      .boundingBox();
    const nav = await page
      .getByRole('navigation', { name: 'Main navigation', exact: true })
      .boundingBox();
    assert(logo.y + logo.height <= nav.y, 'Mobile navigation must not overlap the wordmark.');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({ path: 'artifacts/ui/portfolio-mobile.png', fullPage: true });

    await page.goto(base + '/#/experiment');
    await page
      .getByRole('heading', { name: 'Controlled strategy trial evidence', exact: true })
      .waitFor();
    await page.getByRole('table', { name: 'All three paired outcomes', exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({ path: 'artifacts/ui/experiment-mobile.png', fullPage: true });
    await page.goto(base + '/#/example/stock-recovery');
    await page.getByRole('button', { name: 'Jump to the obstacle', exact: true }).click();

    const shopping = await (
      await page.request.get(base + '/examples/stock-recovery/replay.json')
    ).json();
    const stockEvent = shopping.match.contestants[0].events.find((e) => e.type === 'availability');
    const rejectedStep = shopping.match.contestants[0].steps.find(
      (s) =>
        s.action !== 'start' &&
        s.elapsedMs >= stockEvent.elapsedMs + (shopping.match.contestants[0].eventOffsetMs || 0),
    );
    assert.equal(
      Number(await page.getByLabel('Replay position', { exact: true }).inputValue()),
      rejectedStep.elapsedMs,
    );
    const mobileBar = await page
      .getByRole('group', { name: 'Shared replay controls', exact: true })
      .boundingBox();
    const mobilePanel = await page
      .getByRole('region', { name: 'Contestant A', exact: true })
      .boundingBox();
    assert(mobileBar.x >= 0 && mobileBar.x + mobileBar.width <= 375);
    assert(mobileBar.y + mobileBar.height <= mobilePanel.y);
    const beforeSwitch = await page.getByLabel('Replay position', { exact: true }).inputValue();
    await page.getByRole('button', { name: /^Watch B/ }).click();
    assert.equal(
      await page.getByLabel('Replay position', { exact: true }).inputValue(),
      beforeSwitch,
    );
    assert.equal(
      await page.getByRole('region', { name: 'Contestant A', exact: true }).isVisible(),
      false,
    );
    assert.equal(
      await page.getByRole('region', { name: 'Contestant B', exact: true }).isVisible(),
      true,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.waitForFunction(() =>
      [...document.querySelectorAll('video')].every((v) => v.readyState >= 2 && !v.seeking),
    );
    await page.waitForTimeout(150);
    await page.screenshot({ path: 'artifacts/ui/portfolio-mobile-replay.png', fullPage: true });
    assert.deepEqual(errors, []);
    if (process.env.ARENA_RECORD_DEMO === 'true') {
      const demo = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        reducedMotion: 'reduce',
        recordVideo: { dir: folder, size: { width: 1440, height: 1000 } },
      });
      const screen = await demo.newPage();
      const video = screen.video();
      await screen.goto(base);
      await screen
        .getByRole('heading', { name: 'Pick a question. Watch it unfold.', exact: true })
        .waitFor();
      await delay(3000);
      await screen.locator('a[href="#/example/cancel-renewal"]').click();
      await screen.getByLabel('Play replay', { exact: true }).click();
      await screen.getByLabel('Playback speed').selectOption('2');
      await screen.getByRole('button', { name: 'Enlarge contestant A', exact: true }).click();
      await delay(1500);
      await screen.getByRole('button', { name: 'Show both contestants', exact: true }).click();
      await delay(4000);
      await screen.locator('.replay-controls').scrollIntoViewIfNeeded();
      await delay(2000);
      await screen.getByText('Explore the recorded actions', { exact: true }).click();
      await screen.getByRole('button', { name: 'A: Renewal turned off', exact: true }).click();
      await delay(3000);
      await screen.goto(base + '/#/example/stock-recovery');
      await screen.getByLabel('Play replay', { exact: true }).click();
      await screen.getByLabel('Playback speed').selectOption('4');
      await delay(5000);
      await screen.getByRole('button', { name: 'Jump to the obstacle', exact: true }).click();
      await screen.getByText('Explore the recorded actions', { exact: true }).click();
      await screen.locator('.turning-points').scrollIntoViewIfNeeded();
      await screen.getByRole('button', { name: 'A: Item unavailable', exact: true }).click();
      await delay(3000);
      await screen.getByRole('button', { name: 'A: Alternative committed', exact: true }).click();
      await delay(3000);
      await screen.goto(base + '/#/example/grader-failure');
      await screen.getByText('Explore the recorded actions', { exact: true }).click();
      await screen.getByRole('button', { name: 'B: Confirm order', exact: true }).click();
      await screen.getByText('Reveal verified results', { exact: true }).click();
      await screen.locator('.replay-controls').scrollIntoViewIfNeeded();
      await delay(4000);
      await screen.goto(base);
      await screen.getByLabel('Strategy preset', { exact: true }).first().selectOption('checklist');
      await screen
        .getByLabel('Task instructions', { exact: true })
        .first()
        .scrollIntoViewIfNeeded();
      await delay(4000);
      await demo.close();
      mkdirSync('docs/demo', { recursive: true });
      await video.saveAs('docs/demo/walkthrough.webm');
    }
    console.log(
      'PASS: fresh production database, evidence route/download, explicit experiment loading and custom drafts, enlarged checkpoint/event switching, both obstacle jumps, shared controls, mobile switching, media fallbacks and scripted labels. No inference.',
    );
  } finally {
    if (browser) await browser.close();
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      if (child.exitCode !== null) resolve();
      else child.once('exit', resolve);
    });
    rmSync(folder, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
