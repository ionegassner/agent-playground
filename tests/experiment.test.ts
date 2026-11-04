import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchesExperiment } from '../src/lib/experiment.ts';
import type { ExperimentEvidence } from '../src/lib/experiment.ts';
const evidence: ExperimentEvidence = JSON.parse(
  readFileSync('public/experiments/strategy-trials.json', 'utf8'),
);
test('the experiment question requires the recorded room and both active instructions', () => {
  assert.equal(matchesExperiment(evidence.scenarioId, evidence.configs, evidence), true);
  assert.equal(matchesExperiment('subscription-trap', evidence.configs, evidence), false);
  assert.equal(
    matchesExperiment(
      evidence.scenarioId,
      [{ ...evidence.configs[0], instructions: 'An older saved prompt.' }, evidence.configs[1]],
      evidence,
    ),
    false,
  );
  assert.equal(
    matchesExperiment(evidence.scenarioId, [...evidence.configs].reverse(), evidence),
    false,
  );
  assert.equal(matchesExperiment(evidence.scenarioId, evidence.configs, null), false);
});
test('served evidence retains every paired outcome and independently graded final state', () => {
  assert.deepEqual(
    evidence.trials.map((t) => t.contestants.map((c) => c.actions)),
    [
      [20, 8],
      [18, 8],
      [18, 8],
    ],
  );
  for (const trial of evidence.trials)
    for (const c of trial.contestants) {
      assert.equal(c.correct, true);
      assert.equal(c.result?.correct, c.correct);
      assert(c.result?.checks.every((check) => check.passed));
      assert(c.events.some((e) => e.type === 'availability'));
      assert(c.events.some((e) => e.type === 'order'));
    }
});
