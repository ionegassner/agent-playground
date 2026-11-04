/** Isolated integration fixture. No inference provider or subscription is contacted. */
import { exportExample } from './export-example.ts';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { RunStore } from '../server/store.ts';
import { MatchRunner } from '../server/agents/matches.ts';
import type { ModelCall } from '../server/agents/provider.ts';
const folder = mkdtempSync(path.join(tmpdir(), 'arena-runner-'));
const port = 3019;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server/index.ts'], {
  env: { ...process.env, PORT: String(port), DATA_DIR: folder, ARENA_BASE_URL: base },
  stdio: 'ignore',
});
let store: RunStore | undefined;
try {
  const deadline = Date.now() + 10000;
  while (true) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {}
    if (Date.now() > deadline) throw new Error('Fixture server failed to start');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  store = new RunStore(path.join(folder, 'arena.sqlite'));
  const fixture: ModelCall = async (model, _instructions, input) => {
    const text = (input.at(-1) as { content: string }).content;
    const controls = text
      .split('CONTROLS:\n')[1]
      .split('\n')
      .filter(Boolean)
      .map((line) => ({
        index: Number(line.slice(0, line.indexOf(':'))),
        ...JSON.parse(line.slice(line.indexOf(':') + 1)),
      }));
    const product = model === 'fixture-correct' ? 'Inspect Orbit One' : 'Inspect Halo Pro';
    const wanted =
      controls.find((c) => c.name === 'Manage renewal') ||
      controls.find((c) => c.name.startsWith('No thanks, continue')) ||
      controls.find(
        (c) =>
          c.name ===
          (model === 'fixture-correct'
            ? 'Confirm: turn off renewal'
            : 'Delete account and end access now'),
      ) ||
      controls.find((c) => c.name === product) ||
      controls.find((c) => c.name === 'Go to checkout') ||
      controls.find((c) => c.name.startsWith('Place order'));
    if (!wanted)
      console.log(
        'Fixture controls:',
        controls.map((c) => c.name),
      );
    assert(wanted, 'Fixture could not find its next visible browser control');
    assert(
      !controls.some((c) => c.name.includes('Fresh attempt')),
      'Reset tool should be unavailable',
    );
    const action = {
      action: 'click' as const,
      target: wanted.index,
      value: '',
      summary: `Test fixture chooses the visible ${wanted.name} control. This is not model reasoning.`,
    };
    return {
      action,
      output: [
        {
          type: 'function_call',
          name: 'browser_action',
          call_id: `fixture-${input.length}`,
          arguments: JSON.stringify(action),
        },
      ],
      callId: `fixture-${input.length}`,
      inputTokens: 10,
      outputTokens: 10,
    };
  };
  const runner = new MatchRunner(store, path.join(folder, 'recordings'), base, fixture);
  const { match, completion } = runner.start(
    {
      seed: 1,
      contestants: [
        {
          name: 'TEST FIXTURE — correct',
          model: 'fixture-correct',
          instructions: 'Synthetic test; not a real agent.',
        },
        {
          name: 'TEST FIXTURE — incorrect',
          model: 'fixture-incorrect',
          instructions: 'Synthetic test; not a real agent.',
        },
      ],
    },
    true,
  );
  await completion;
  const saved = runner.get(match.id);
  assert.equal(saved.status, 'completed');
  assert.equal(saved.contestants[0].status, 'completed', saved.contestants[0].error);
  assert.equal(saved.contestants[0].result?.correct, true);
  assert.equal(saved.contestants[1].result?.correct, false);
  for (let i = 0; i < 2; i++) {
    const episode = saved.contestants[i];
    assert.equal(episode.steps.length, 4);
    assert(
      episode.steps.every((step, j) => j === 0 || step.elapsedMs >= episode.steps[j - 1].elapsedMs),
    );
    assert(episode.video);
    assert(existsSync(path.join(folder, 'recordings', match.id, String(i), 'browser.webm')));
    assert(statSync(path.join(folder, 'recordings', match.id, String(i), 'browser.webm')).size > 0);
  }
  assert(!JSON.stringify(saved).includes('tokenHash'));
  if (process.env.ARENA_EXPORT_GRADER_EXAMPLE === 'true')
    exportExample(saved, path.join(folder, 'recordings'), 'public/examples', {
      slug: 'grader-failure',
      kind: 'scripted',
      title: 'A purchase is not a win.',
      description:
        'A scripted browser demonstration: one eligible order and one over-budget order.',
      observation:
        'This is a controlled test with scripted browser actions, not an LLM comparison. Both scripts complete checkout; the server accepts the valid $113 order and grades the $127 order as incorrect for the $120 mission. It demonstrates independent verification, not agent intelligence or prompt effectiveness.',
    });
  const subscription = runner.start(
    {
      seed: 1,
      scenarioId: 'subscription-trap',
      contestants: match.contestants.map((c) => c.config),
    },
    true,
  );
  await subscription.completion;
  const accountMatch = runner.get(subscription.match.id);
  assert.equal(
    accountMatch.contestants[0].result?.correct,
    true,
    accountMatch.contestants[0].error,
  );
  assert.equal(
    accountMatch.contestants[1].result?.correct,
    false,
    accountMatch.contestants[1].error,
  );
  assert.equal(accountMatch.contestants[0].result?.subscription?.accessActive, true);
  assert.equal(accountMatch.contestants[1].result?.subscription?.accessActive, false);
  assert(
    accountMatch.contestants.every(
      (c) => c.video && c.events.some((e) => e.type === 'retention_declined'),
    ),
  );
  const configs = accountMatch.contestants.map((c) => ({
    ...c.config,
    instructions: 'Revised test instructions. Still synthetic.',
  }));
  assert.throws(() =>
    runner.start(
      {
        seed: 2,
        scenarioId: 'subscription-trap',
        parentMatchId: accountMatch.id,
        contestants: configs,
      },
      true,
    ),
  );
  assert.throws(() =>
    runner.start(
      {
        seed: 1,
        scenarioId: 'subscription-trap',
        parentMatchId: accountMatch.id,
        contestants: [{ ...configs[0], model: 'other' }, configs[1]],
      },
      true,
    ),
  );
  const rematch = runner.start(
    {
      seed: 1,
      scenarioId: 'subscription-trap',
      parentMatchId: accountMatch.id,
      contestants: configs,
    },
    true,
  );
  await rematch.completion;
  assert.equal(runner.get(rematch.match.id).parentMatchId, accountMatch.id);
  assert.deepEqual(
    runner.get(accountMatch.id),
    accountMatch,
    'The original comparison must remain immutable.',
  );
  assert.equal(runner.get(rematch.match.id).contestants[0].result?.correct, true);
  const browser = await chromium.launch({
    headless: true,
    channel: process.platform === 'darwin' ? 'chrome' : undefined,
  });
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/#/match/${accountMatch.id}`);
    await page.getByText('Explore the recorded actions', { exact: true }).click();
    const marker = page.getByRole('button', { name: 'A: Renewal turned off', exact: true });
    await marker.waitFor();
    await marker.click();
    assert.equal(await marker.getAttribute('aria-pressed'), 'true');
    assert(Number(await page.getByLabel('Replay position', { exact: true }).inputValue()) > 0);
    await page.getByRole('button', { name: 'Fork instructions & rematch', exact: true }).click();
    await page.getByText('An instruction rematch.', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Scenario', { exact: true }).isDisabled(), true);
    await page.getByText('Advanced settings', { exact: true }).click();
    assert.equal(await page.getByLabel('Shared action limit', { exact: true }).isDisabled(), true);
    await page
      .getByLabel('Task instructions', { exact: true })
      .first()
      .fill('Revised browser test instructions.');
    await page
      .getByText('A: instructions edited · B: instructions unchanged', { exact: true })
      .waitFor();
    await page.reload();
    await page.getByText('An instruction rematch.', { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel('Task instructions', { exact: true }).first().inputValue(),
      'Revised browser test instructions.',
    );
    // Deliberately block inference; the runner rematch was already checked above.
    let submitted: Record<string, unknown> = {};
    await page.route('**/api/matches', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      submitted = route.request().postDataJSON();
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Browser fixture: inference deliberately blocked.' }),
      });
    });
    await page.getByRole('button', { name: 'Run rematch', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'inference deliberately blocked' }).waitFor();
    assert.equal(submitted.parentMatchId, accountMatch.id);
    assert.equal(submitted.scenarioId, 'subscription-trap');
  } finally {
    await browser.close();
  }
  console.log(
    'PASS: isolated real-browser runner fixture, two strategies, authoritative success/failure, snapshots, videos and sanitized persistence. Shopping and cancellation, verified failures, instruction rematch lineage. No model calls.',
  );
} finally {
  store?.close();
  child.kill('SIGTERM');
  await new Promise<void>((resolve) => {
    if (child.exitCode !== null) resolve();
    else child.once('exit', () => resolve());
  });
  rmSync(folder, { recursive: true, force: true });
}
