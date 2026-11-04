import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RunStore } from '../server/store.ts';
import { MatchRunner } from '../server/agents/matches.ts';
import { codexCall } from '../server/agents/codex.ts';
import { openaiCall } from '../server/agents/provider.ts';
test('local subscription mode selects Codex, never the API adapter', () => {
  const previous = process.env.ARENA_INFERENCE;
  delete process.env.ARENA_INFERENCE;
  const store = new RunStore(':memory:');
  try {
    const runner = new MatchRunner(store, '/tmp', 'http://127.0.0.1:3001');
    assert.equal(runner.call, codexCall);
    assert.notEqual(runner.call, openaiCall);
    assert.deepEqual(runner.status().models, ['codex-default']);
  } finally {
    store.close();
    if (previous) process.env.ARENA_INFERENCE = previous;
  }
});

test('unsupported scenarios, budgets and agent settings cannot start a comparison', () => {
  const store = new RunStore(':memory:');
  try {
    const runner = new MatchRunner(store, '/tmp', 'http://127.0.0.1:3001');
    const contestants = [
      { name: 'A', model: 'codex-default', instructions: 'Follow the task.' },
      { name: 'B', model: 'codex-default', instructions: 'Follow the task.' },
    ];
    for (const invalid of [
      { scenarioId: 'invented' },
      { contestants: [null, contestants[1]] },
      { contestants: ['not a configuration', contestants[1]] },
      { contestants: [[], contestants[1]] },
      { contestants: [{ ...contestants[0], reasoningEffort: null }, contestants[1]] },
      { limits: { actions: 999 } },
      { limits: { timeMs: 1 } },
      { contestants: [{ ...contestants[0], reasoningEffort: 'magic' }, contestants[1]] },
      { contestants: [{ ...contestants[0], memorySteps: 999 }, contestants[1]] },
    ]) {
      assert.throws(
        () => runner.start({ seed: 1, contestants, ...invalid }),
        (error) => error instanceof Error && 'status' in error && error.status === 400,
      );
      assert.equal(runner.active, false);
    }
    assert.equal(runner.list().length, 0);
  } finally {
    store.close();
  }
});
