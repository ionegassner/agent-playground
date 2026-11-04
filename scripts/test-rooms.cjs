/** Browser acceptance checks. No inference calls. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.ARENA_BASE_URL || 'http://127.0.0.1:5174';
(async () => {
  const browser = await chromium.launch({
    channel:
      process.env.ARENA_BROWSER_CHANNEL || (process.platform === 'darwin' ? 'chrome' : undefined),
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    fs.mkdirSync('artifacts/ui', { recursive: true });
    async function start() {
      await page.goto(base + '/#/');
      await page.getByLabel('Scenario', { exact: true }).selectOption('subscription-trap');
      await page.getByRole('button', { name: 'Try the challenge yourself', exact: true }).click();
      await page.getByRole('heading', { name: 'Leave on your terms.', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Manage renewal', exact: true }).waitFor();
    }
    // Presets persist independently for both agents, without any inference calls.
    await page.goto(base + '/#/');
    await page.getByLabel('Strategy preset', { exact: true }).nth(0).selectOption('baseline');
    await page.getByLabel('Strategy preset', { exact: true }).nth(1).selectOption('checklist');
    const originalInstructions = await page
      .getByLabel('Task instructions', { exact: true })
      .evaluateAll((elements) => elements.map((el) => el.value));
    await page.reload();
    assert.equal(
      await page.getByLabel('Strategy preset', { exact: true }).nth(0).inputValue(),
      'baseline',
    );
    assert.equal(
      await page.getByLabel('Strategy preset', { exact: true }).nth(1).inputValue(),
      'checklist',
    );
    assert.deepEqual(
      await page
        .getByLabel('Task instructions', { exact: true })
        .evaluateAll((elements) => elements.map((el) => el.value)),
      originalInstructions,
    );
    await page
      .getByLabel('Task instructions', { exact: true })
      .first()
      .fill('My custom instructions.');
    assert.equal(
      await page.getByLabel('Strategy preset', { exact: true }).first().inputValue(),
      '',
    );
    await page.goto(base + '/#/rules');
    await page.goto(base + '/#/');
    assert.equal(
      await page.getByLabel('Task instructions', { exact: true }).first().inputValue(),
      'My custom instructions.',
    );
    const secondTab = await context.newPage();
    await secondTab.goto(base + '/#/');
    assert.equal(
      await secondTab.getByLabel('Task instructions', { exact: true }).first().inputValue(),
      'My custom instructions.',
    );
    assert.equal(
      await secondTab.getByLabel('Strategy preset', { exact: true }).nth(1).inputValue(),
      'checklist',
    );
    await secondTab.close();
    await start();
    await page.screenshot({ path: 'artifacts/ui/subscription-account.png', fullPage: true });
    await page.getByRole('button', { name: 'Manage renewal', exact: true }).click();
    await page
      .getByRole('button', { name: 'No thanks, continue to cancellation', exact: true })
      .waitFor();
    await page.screenshot({ path: 'artifacts/ui/subscription-retention.png', fullPage: true });
    await page
      .getByRole('button', { name: 'No thanks, continue to cancellation', exact: true })
      .click();
    await page.getByRole('heading', { name: 'Choose how you leave.', exact: true }).waitFor();
    await page.screenshot({ path: 'artifacts/ui/subscription-confirmation.png', fullPage: true });
    await page.getByRole('button', { name: 'Confirm: turn off renewal', exact: true }).click();
    await page.getByRole('heading', { name: 'You found your way out.', exact: true }).waitFor();
    await page.getByText('4/4', { exact: true }).waitFor();
    await page.getByText('Automatic renewal off', { exact: true }).waitFor();
    await page.screenshot({ path: 'artifacts/ui/subscription-result.png', fullPage: true });
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download run record', exact: true }).click();
    const download = await downloaded;
    await download.saveAs('artifacts/ui/subscription-record.json');
    const record = JSON.parse(fs.readFileSync('artifacts/ui/subscription-record.json', 'utf8'));
    assert.equal(record.result.correct, true);
    assert.equal(record.result.order, null);
    assert.equal(record.result.subscription.renewalEnabled, false);
    assert.equal(record.result.subscription.accessActive, true);
    await page.reload();
    await page.getByText('4/4', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Try the same challenge', exact: true }).click();
    await page.getByRole('button', { name: 'Manage renewal', exact: true }).click();
    await page
      .getByRole('button', { name: 'Keep my membership · accept offer', exact: true })
      .click();
    await page.getByRole('heading', { name: 'Not quite an escape.', exact: true }).waitFor();
    await page.getByText('Automatic renewal on', { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await start();
    await page.getByRole('button', { name: 'Manage renewal', exact: true }).click();
    await page
      .getByRole('button', { name: 'No thanks, continue to cancellation', exact: true })
      .click();
    await page.screenshot({ path: 'artifacts/ui/subscription-mobile.png', fullPage: true });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page
      .getByRole('button', { name: 'Delete account and end access now', exact: true })
      .click();
    await page.getByRole('heading', { name: 'Not quite an escape.', exact: true }).waitFor();
    await page.getByText('Access ended immediately', { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(
      'PASS: cancellation, retention failure, deletion failure, confirmed account state, export, reset, persistence and mobile layout. No inference.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
