// Checks actual media synchronization against an existing recorded comparison.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.ARENA_BASE_URL || 'http://127.0.0.1:5174';
(async () => {
  const browser = await chromium.launch({
    channel: process.env.ARENA_BROWSER_CHANNEL || undefined,
    headless: true,
  });
  try {
    const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    const records = await (await p.request.get(`${base}/api/matches`)).json();
    const match = records.find(
      (m) => m.status === 'completed' && m.contestants.every((c) => c.video && c.result),
    );
    assert(match, 'A completed comparison with two videos is required.');
    await p.goto(`${base}/#/match/${match.id}`);
    const videos = p.locator('.episode-browser video');
    await p.waitForFunction(
      () =>
        document.querySelectorAll('.episode-browser video').length === 2 &&
        [...document.querySelectorAll('.episode-browser video')].every((v) => v.readyState >= 2),
    );
    await p.getByLabel('Play replay', { exact: true }).click();
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.episode-browser video')].every(
        (v) => v.currentTime > 1.5 && !v.paused,
      ),
    );
    let times = await videos.evaluateAll((vs) => vs.map((v) => v.currentTime));
    assert(Math.abs(times[0] - times[1]) < 0.25, JSON.stringify(times));
    await p.getByLabel('Pause replay', { exact: true }).click();
    await p.waitForFunction(() =>
      [...document.querySelectorAll('.episode-browser video')].every((v) => v.paused),
    );
    const lengths = await videos.evaluateAll((vs) => vs.map((v) => v.duration));
    const target = Math.min(8, Math.min(...lengths) - 1);
    await p.getByLabel('Replay position').fill(String(target * 1000));
    await p
      .waitForFunction(
        (t) =>
          [...document.querySelectorAll('.episode-browser video')].every(
            (v) => !v.seeking && Math.abs(v.currentTime - t) < 0.2,
          ),
        target,
      )
      .catch(async (error) => {
        console.log(
          'media diagnostics',
          await videos.evaluateAll((vs) =>
            vs.map((v) => ({
              time: v.currentTime,
              paused: v.paused,
              seeking: v.seeking,
              ready: v.readyState,
            })),
          ),
          await p.getByLabel('Replay position').inputValue(),
        );
        throw error;
      });
    await p.getByLabel('Playback speed').selectOption('2');
    await p.getByLabel('Play replay', { exact: true }).click();
    await p.waitForFunction(
      (t) =>
        [...document.querySelectorAll('.episode-browser video')].every(
          (v) => v.playbackRate === 2 && v.currentTime > t + 0.5,
        ),
      target,
    );
    await p.getByLabel('Pause replay', { exact: true }).click();
    await p.screenshot({ path: 'artifacts/ui/video-replay.png', fullPage: true });
    await p.goto(`${base}/#/`);
    await p.getByLabel('Scenario', { exact: true }).selectOption('bulk-order');
    await p.getByRole('button', { name: 'Try the challenge yourself', exact: true }).click();
    await p.getByRole('heading', { name: 'Team purchase', exact: true }).waitFor();
    assert(await p.getByText('Exactly two pairs. No optional extras.').count());
    assert.deepEqual(errors, []);
    console.log(
      'PASS: both videos track the shared clock; pause, seek and speed work; human mode uses the selected scenario.',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
