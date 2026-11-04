import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import type { ExampleSummary, RecordedExample } from '../src/lib/match-contracts.ts';

test('bundled examples have portable recordings and explicit provenance without run credentials', () => {
  const examples: ExampleSummary[] = JSON.parse(readFileSync('public/examples/index.json', 'utf8'));
  assert.equal(examples.length, 3);
  for (const entry of examples) {
    const text = readFileSync(`public/examples/${entry.slug}/replay.json`, 'utf8');
    assert(!/tokenHash|OPENAI_API_KEY|run_[a-f0-9-]{36}/.test(text));
    const example: RecordedExample = JSON.parse(text);
    assert.equal(example.kind, entry.kind);
    assert.equal(example.match.status, 'completed');
    assert.equal(example.match.contestants.length, 2);
    for (const episode of example.match.contestants) {
      assert(episode.result);
      for (const asset of [episode.video!, ...episode.steps.map((s) => s.frame)]) {
        assert(asset.startsWith(`/examples/${entry.slug}/`));
        const file = path.join('public', asset);
        assert(existsSync(file), file);
        assert(statSync(file).size > 0);
      }
    }
  }
});

test('curated outcome descriptions match recorded server evidence', () => {
  const load = (slug: string): RecordedExample =>
    JSON.parse(readFileSync(`public/examples/${slug}/replay.json`, 'utf8'));
  const cancellation = load('cancel-renewal');
  for (const episode of cancellation.match.contestants) {
    assert.equal(episode.result?.correct, true);
    assert.equal(episode.result?.subscription?.renewalEnabled, false);
    assert.equal(episode.result?.subscription?.accessActive, true);
    assert.equal(episode.steps.filter((s) => s.action !== 'start').length, 3);
  }
  const recovery = load('stock-recovery');
  for (const episode of recovery.match.contestants) {
    assert.equal(episode.result?.correct, true);
    assert(episode.events.some((e) => e.type === 'availability'));
    assert(episode.events.some((e) => e.type === 'recovered'));
    assert.equal(episode.steps.filter((s) => s.action !== 'start').length, 8);
  }
  const scripted = load('grader-failure');
  assert.equal(scripted.kind, 'scripted');
  assert.equal(scripted.match.contestants[0].result?.correct, true);
  assert.equal(scripted.match.contestants[1].result?.correct, false);
  assert.equal(scripted.match.contestants[1].result?.order?.total, 127);
});

test('recorded profile comparisons disclose their purpose and share controlled model settings', () => {
  for (const slug of ['cancel-renewal', 'stock-recovery']) {
    const example: RecordedExample = JSON.parse(
      readFileSync(`public/examples/${slug}/replay.json`, 'utf8'),
    );
    const [a, b] = example.match.contestants;
    assert(example.comparisonPurpose);
    assert.notEqual(a.config.instructions, b.config.instructions);
    assert.equal(a.config.model, b.config.model);
    assert.equal(a.config.reasoningEffort, b.config.reasoningEffort);
    assert.equal(a.config.memorySteps, b.config.memorySteps);
  }
});
