/** Model-free evaluation fixtures exercising the production workflow domain. */
import { RunStore } from '../server/store.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
import type { RunRecord } from '../src/lib/contracts.ts';

function complete(store: RunStore, id: string, token: string): RunRecord {
  const run = store.get(id, token);
  store.action(id, token, { type: 'inspect', itemId: 'cloud' });
  store.action(id, token, { type: 'checkout' });
  let response = store.purchase(id, token, {
    submissionId: 'scripted-cloud',
    itemId: 'cloud',
    quantity: 1,
    extras: false,
    contact: run.mission.contact,
  });
  if (response.status === 409) {
    store.action(id, token, { type: 'browse' });
    store.action(id, token, { type: 'inspect', itemId: 'orbit' });
    store.action(id, token, { type: 'checkout' });
    response = store.purchase(id, token, {
      submissionId: 'scripted-orbit',
      itemId: 'orbit',
      quantity: 1,
      extras: false,
      contact: run.mission.contact,
    });
  }
  if (!response.run.result?.correct) throw new Error(`Fixture failed for seed ${run.seed}`);
  return store.record(id, token);
}
function semanticResult(record: RunRecord) {
  return {
    correct: record.result.correct,
    itemId: record.result.order.itemId,
    total: record.result.order!.total,
    attempts: record.result.attempts,
    recoveries: record.result.recoveries,
    checks: record.result.checks,
    eventTypes: record.events.map((event) => event.type),
  };
}
const results = [];
for (const seed of [1, 2, 3]) {
  const store = new RunStore(':memory:');
  try {
    const { run, token } = store.create(seed);
    const first = complete(store, run.id, token);
    const reset = store.reset(run.id, token);
    if (JSON.stringify(reset.run.items) !== JSON.stringify(run.items))
      throw new Error('Reset changed the starting catalog');
    const second = complete(store, reset.run.id, reset.token);
    if (JSON.stringify(semanticResult(first)) !== JSON.stringify(semanticResult(second)))
      throw new Error(`Rerun changed the workflow for seed ${seed}`);
    results.push({
      scenarioVersion: run.scenarioVersion,
      seed,
      mode: 'scripted domain fixture; no model',
      ...semanticResult(first),
      resetVerified: true,
      rerunEquivalent: true,
    });
  } finally {
    store.close();
  }
}
mkdirSync('artifacts/evaluation', { recursive: true });
writeFileSync(
  'artifacts/evaluation/fixtures.json',
  JSON.stringify({ executedAt: new Date().toISOString(), results }, null, 2),
);
console.log(
  `PASS: ${results.length} seeds, two equivalent executions per seed, reset and grading verified.`,
);
