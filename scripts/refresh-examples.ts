/** Explicit, local-only refresh. --live uses the operator's authenticated CLI allowance. */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, renameSync, existsSync } from 'node:fs';
import path from 'node:path';
import { RunStore } from '../server/store.ts';
import { MatchRunner } from '../server/agents/matches.ts';
import { exportExample } from './export-example.ts';
import type { ModelCall } from '../server/agents/provider.ts';
import type { RecordedExample } from '../src/lib/match-contracts.ts';

if (!process.argv.includes('--live')) {
  console.log(
    'This refresh makes live model calls using your local Codex account. Run with --live to opt in.',
  );
  process.exit(0);
}
const directory = path.resolve('data', `example-refresh-${Date.now()}`);
const out = path.join(directory, 'examples');
mkdirSync(directory, { recursive: true });
const base = 'http://127.0.0.1:3035';
process.env.ARENA_INFERENCE = 'codex';
delete process.env.ARENA_MODEL_A;
delete process.env.ARENA_MODEL_B;
const child = spawn(process.execPath, ['server/index.ts'], {
  env: { ...process.env, PORT: '3035', DATA_DIR: directory, ARENA_BASE_URL: base },
  stdio: 'ignore',
});
let store: RunStore | undefined;
try {
  const deadline = Date.now() + 10000;
  while (true) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {}
    if (Date.now() > deadline) throw new Error('Local recording server did not start.');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  store = new RunStore(path.join(directory, 'arena.sqlite'));
  const runner = new MatchRunner(store, path.join(directory, 'recordings'), base);
  for (const slug of ['cancel-renewal', 'stock-recovery']) {
    const previous: RecordedExample = JSON.parse(
      readFileSync(`public/examples/${slug}/replay.json`, 'utf8'),
    );
    console.log(`Starting real agent comparison: ${slug}. Shared limit: 8 actions, 3 minutes.`);
    const { match, completion } = runner.start({
      seed: 1,
      scenarioId: previous.match.scenarioId,
      limits: { actions: 8, timeMs: 180000 },
      contestants: previous.match.contestants.map((c) => ({ ...c.config, model: 'codex-default' })),
    });
    await completion;
    const recorded = runner.get(match.id);
    console.log(
      JSON.stringify({
        slug,
        contestants: recorded.contestants.map((c) => ({
          profile: c.config.name,
          status: c.status,
          correct: c.result?.correct ?? null,
          actions: c.steps.filter((s) => s.action !== 'start').length,
          inputTokens: c.inputTokens,
          outputTokens: c.outputTokens,
          error: c.error,
        })),
      }),
    );
    if (recorded.contestants.some((c) => !c.steps.some((s) => s.action !== 'start')))
      throw new Error(
        `No agent actions were recorded for ${slug}. Existing examples were not replaced. See ${directory}.`,
      );
    const { match: _previousMatch, ...metadata } = previous;
    metadata.comparisonPurpose =
      slug === 'cancel-renewal'
        ? 'Compare checking each requirement with taking a direct cancellation route. The task tests whether each profile stops renewal while preserving paid access and declining the retention offer.'
        : 'Compare broad exploration with targeted verification after the requested product becomes unavailable. The task tests recovery while preserving product requirements and the delivered-price budget.';
    metadata.observation = recorded.contestants
      .map(
        (c, index) =>
          `Profile ${index ? 'B' : 'A'} (${c.config.name}): ${c.result?.correct ? 'all mission requirements verified' : c.result ? 'mission requirements missed' : c.error || 'no verified result'}. ${c.steps.filter((s) => s.action !== 'start').length} actions recorded.`,
      )
      .join(' ');
    exportExample(recorded, path.join(directory, 'recordings'), out, metadata);
  }
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
    const wanted =
      controls.find(
        (c) => c.name === (model === 'fixture-correct' ? 'Inspect Orbit One' : 'Inspect Halo Pro'),
      ) ||
      controls.find((c) => c.name === 'Go to checkout') ||
      controls.find((c) => c.name.startsWith('Place order'));
    if (!wanted) throw new Error('Scripted fixture could not find its next control.');
    const action = {
      action: 'click' as const,
      target: wanted.index,
      value: '',
      summary: `Scripted fixture selects ${wanted.name}. No model call.`,
    };
    return {
      action,
      output: [],
      callId: `fixture-${input.length}`,
      inputTokens: 0,
      outputTokens: 0,
    };
  };
  const fixtureRunner = new MatchRunner(store, path.join(directory, 'recordings'), base, fixture);
  const scripted: RecordedExample = JSON.parse(
    readFileSync('public/examples/grader-failure/replay.json', 'utf8'),
  );
  const started = fixtureRunner.start(
    {
      seed: 1,
      scenarioId: 'signal-hunt',
      limits: { actions: 8, timeMs: 180000 },
      contestants: scripted.match.contestants.map((c) => c.config),
    },
    true,
  );
  await started.completion;
  const recorded = fixtureRunner.get(started.match.id);
  if (
    recorded.contestants[0].result?.correct !== true ||
    recorded.contestants[1].result?.correct !== false
  )
    throw new Error(
      'Scripted grader outcomes did not match the fixture. Existing examples were not replaced.',
    );
  const { match: _oldMatch, ...metadata } = scripted;
  exportExample(recorded, path.join(directory, 'recordings'), out, metadata);
  // Swap only after all recordings have finished. Keep raw records and old examples locally.
  for (const slug of ['cancel-renewal', 'stock-recovery', 'grader-failure']) {
    const old = `public/examples/${slug}`;
    if (existsSync(old)) renameSync(old, path.join(directory, `previous-${slug}`));
    renameSync(path.join(out, slug), old);
  }
  console.log(
    `Refreshed all three examples. Raw records and previous exports remain locally in ${directory}.`,
  );
} finally {
  store?.close();
  child.kill('SIGTERM');
  await new Promise<void>((resolve) =>
    child.exitCode !== null ? resolve() : child.once('exit', () => resolve()),
  );
}
