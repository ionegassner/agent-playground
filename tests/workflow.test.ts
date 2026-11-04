import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { RunStore, DomainError } from '../server/store.ts';
import type { Purchase } from '../src/lib/contracts.ts';

const purchase = (itemId = 'orbit', changes: Partial<Purchase> = {}): Purchase => ({
  submissionId: 'submission-0001',
  itemId,
  quantity: 1,
  extras: false,
  contact: { name: 'Alex Player', email: 'alex@example.test' },
  ...changes,
});
function fixture(seed = 1) {
  let clock = 1000;
  const store = new RunStore(':memory:', () => clock);
  const created = store.create(seed);
  return {
    store,
    ...created,
    tick: (ms: number) => {
      clock += ms;
    },
    checkout: (itemId = 'orbit') => {
      store.action(created.run.id, created.token, { type: 'inspect', itemId });
      store.action(created.run.id, created.token, { type: 'checkout' });
    },
  };
}
function isStatus(status: number) {
  return (error: unknown) => error instanceof DomainError && error.status === status;
}

test('browse → inspect → checkout → commit → grade produces a correct authoritative order', () => {
  const f = fixture();
  try {
    f.checkout();
    f.tick(2350);
    const response = f.store.purchase(f.run.id, f.token, purchase());
    assert.equal(response.status, 201);
    assert.equal(response.run.result?.correct, true);
    assert.equal(response.run.result?.order!.total, 113);
    assert.equal(response.run.result?.elapsedMs, 2350);
    assert.equal(response.run.phase, 'complete');
    assert.equal(response.run.result?.checks.length, 6);
  } finally {
    f.store.close();
  }
});
test('checkout cannot skip the workflow or switch the inspected product', () => {
  const f = fixture();
  try {
    assert.throws(() => f.store.purchase(f.run.id, f.token, purchase()), isStatus(409));
    f.checkout('halo');
    assert.throws(() => f.store.purchase(f.run.id, f.token, purchase()), isStatus(409));
    assert.equal(f.store.get(f.run.id, f.token).result, null);
  } finally {
    f.store.close();
  }
});
test('grading rejects purchases that miss budget, fit, battery, quantity or extras', () => {
  const examples = [
    { item: 'halo', changes: {}, miss: 'Total at or below $120' },
    { item: 'flux', changes: {}, miss: 'Over-ear headphones' },
    { item: 'echo', changes: {}, miss: 'At least 30 hours of battery' },
    { item: 'weekend', changes: {}, miss: 'Active noise cancellation' },
    { item: 'orbit', changes: { quantity: 2 }, miss: 'Exactly one pair' },
    { item: 'orbit', changes: { extras: true }, miss: 'No optional extras' },
  ];
  for (const example of examples) {
    const f = fixture();
    try {
      f.checkout(example.item);
      const result = f.store.purchase(f.run.id, f.token, purchase(example.item, example.changes))
        .run.result!;
      assert.equal(result.correct, false, example.miss);
      assert.equal(result.checks.find((check) => check.label === example.miss)?.passed, false);
    } finally {
      f.store.close();
    }
  }
});
test('clock-independent availability obstacle is reproducible and supports recovery', () => {
  const f = fixture();
  try {
    f.checkout('cloud');
    f.tick(1000);
    const unavailable = f.store.purchase(f.run.id, f.token, purchase('cloud'));
    assert.equal(unavailable.status, 409);
    assert.equal(unavailable.run.result, null);
    assert.equal(unavailable.run.items.find((i) => i.id === 'cloud')?.available, false);
    f.store.action(f.run.id, f.token, { type: 'browse' });
    f.checkout('orbit');
    const result = f.store.purchase(
      f.run.id,
      f.token,
      purchase('orbit', { submissionId: 'submission-0002' }),
    ).run.result!;
    assert.equal(result.correct, true);
    assert.equal(result.attempts, 2);
    assert.equal(result.recoveries, 1);
  } finally {
    f.store.close();
  }
});
test('even seed keeps Cloud Nine available', () => {
  const f = fixture(2);
  try {
    f.checkout('cloud');
    assert.equal(f.store.purchase(f.run.id, f.token, purchase('cloud')).run.result?.correct, true);
  } finally {
    f.store.close();
  }
});
test('checkout no longer requires exact identity fields', () => {
  const f = fixture();
  try {
    f.checkout();
    const { contact, ...choices } = purchase();
    assert.equal(f.store.purchase(f.run.id, f.token, choices).run.result?.correct, true);
  } finally {
    f.store.close();
  }
});
test('client cannot provide its own price, total, order or grade', () => {
  const f = fixture();
  try {
    f.checkout();
    for (const field of ['price', 'total', 'order', 'correct'])
      assert.throws(
        () => f.store.purchase(f.run.id, f.token, { ...purchase(), [field]: 0 }),
        isStatus(400),
      );
    assert.equal(f.store.get(f.run.id, f.token).result, null);
  } finally {
    f.store.close();
  }
});
test('retry is idempotent; reusing a key with changed choices is rejected', () => {
  const f = fixture();
  try {
    f.checkout();
    const first = f.store.purchase(f.run.id, f.token, purchase());
    f.tick(5000);
    assert.deepEqual(f.store.purchase(f.run.id, f.token, purchase()), first);
    assert.throws(
      () => f.store.purchase(f.run.id, f.token, purchase('orbit', { extras: true })),
      isStatus(409),
    );
    assert.equal(f.store.get(f.run.id, f.token).events.filter((e) => e.type === 'order').length, 1);
  } finally {
    f.store.close();
  }
});
test('completed runs reject a second purchase even under a new key', () => {
  const f = fixture();
  try {
    f.checkout();
    f.store.purchase(f.run.id, f.token, purchase());
    assert.throws(
      () =>
        f.store.purchase(f.run.id, f.token, purchase('orbit', { submissionId: 'submission-0002' })),
      isStatus(409),
    );
  } finally {
    f.store.close();
  }
});
test('fresh runs have equivalent conditions and isolated stock, orders and credentials', () => {
  const f = fixture();
  try {
    const other = f.store.create(1);
    assert.deepEqual(f.run.items, other.run.items);
    f.checkout('cloud');
    f.store.purchase(f.run.id, f.token, purchase('cloud'));
    assert.equal(
      f.store.get(other.run.id, other.token).items.find((i) => i.id === 'cloud')?.available,
      true,
    );
    assert.equal(f.store.get(other.run.id, other.token).result, null);
    assert.throws(() => f.store.get(f.run.id, other.token), isStatus(403));
    assert.throws(() => f.store.purchase(f.run.id, other.token, purchase()), isStatus(403));
    assert.throws(() => f.store.reset(f.run.id, other.token), isStatus(403));
  } finally {
    f.store.close();
  }
});
test('reset creates the same seeded starting state and retires the old active attempt', () => {
  const f = fixture();
  try {
    f.checkout('cloud');
    f.store.purchase(f.run.id, f.token, purchase('cloud'));
    const next = f.store.reset(f.run.id, f.token);
    assert.notEqual(next.run.id, f.run.id);
    assert.equal(next.run.seed, f.run.seed);
    assert.deepEqual(next.run.items, f.run.items);
    assert.equal(next.run.phase, 'browse');
    assert.equal(next.run.result, null);
    assert.equal(f.store.get(f.run.id, f.token).status, 'abandoned');
    assert.throws(() => f.store.action(f.run.id, f.token, { type: 'browse' }), isStatus(409));
  } finally {
    f.store.close();
  }
});
test('time budget is server enforced', () => {
  const f = fixture();
  try {
    f.checkout();
    f.tick(300001);
    assert.throws(() => f.store.purchase(f.run.id, f.token, purchase()), isStatus(409));
    assert.equal(f.store.get(f.run.id, f.token).result, null);
  } finally {
    f.store.close();
  }
});
test('invalid quantity and malformed requests commit no state', () => {
  const f = fixture();
  try {
    f.checkout();
    for (const quantity of [0, 4, 1.5, -1])
      assert.throws(
        () => f.store.purchase(f.run.id, f.token, purchase('orbit', { quantity })),
        isStatus(400),
      );
    assert.throws(() => f.store.purchase(f.run.id, f.token, null), isStatus(400));
    for (const seed of [0, -1, 1.5, NaN, 1000000])
      assert.throws(() => f.store.create(seed), isStatus(400));
  } finally {
    f.store.close();
  }
});
test('database persists committed order and exported records omit session secrets', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'playground-test-'));
  const file = path.join(dir, 'test.sqlite');
  let store = new RunStore(file);
  const created = store.create();
  try {
    store.action(created.run.id, created.token, { type: 'inspect', itemId: 'orbit' });
    store.action(created.run.id, created.token, { type: 'checkout' });
    store.purchase(created.run.id, created.token, purchase());
    store.close();
    store = new RunStore(file);
    assert.equal(store.get(created.run.id, created.token).result?.correct, true);
    const record = store.record(created.run.id, created.token);
    assert.equal(record.recording, 'application-events');
    const encoded = JSON.stringify(record);
    assert.equal(encoded.includes(created.token), false);
    assert.equal(encoded.includes('tokenHash'), false);
    assert.equal(encoded.includes('alex@example.test'), false);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('reset after completion preserves the original result and event record', () => {
  const f = fixture();
  try {
    f.checkout();
    f.store.purchase(f.run.id, f.token, purchase());
    const before = f.store.record(f.run.id, f.token);
    f.store.reset(f.run.id, f.token);
    assert.deepEqual(f.store.record(f.run.id, f.token), before);
    assert.equal(f.store.get(f.run.id, f.token).status, 'completed');
  } finally {
    f.store.close();
  }
});

test('scenario-specific grading checks delivered budgets, battery and bulk quantity', () => {
  const cases = [
    { scenario: 'budget-pick', item: 'echo', quantity: 1, correct: true, total: 88 },
    { scenario: 'budget-pick', item: 'orbit', quantity: 1, correct: false, total: 113 },
    { scenario: 'long-haul', item: 'halo', quantity: 1, correct: true, total: 127 },
    { scenario: 'long-haul', item: 'orbit', quantity: 1, correct: false, total: 113 },
    { scenario: 'bulk-order', item: 'orbit', quantity: 2, correct: true, total: 212 },
    { scenario: 'bulk-order', item: 'orbit', quantity: 1, correct: false, total: 113 },
  ];
  for (const example of cases) {
    const store = new RunStore(':memory:');
    try {
      const { run, token } = store.create(2, 'agent', example.scenario);
      store.action(run.id, token, { type: 'inspect', itemId: example.item });
      store.action(run.id, token, { type: 'checkout' });
      const result = store.purchase(
        run.id,
        token,
        purchase(example.item, { quantity: example.quantity }),
      ).run.result!;
      assert.equal(result.correct, example.correct);
      assert.equal(result.order!.total, example.total);
      assert.equal(
        run.mission.budget,
        example.scenario === 'budget-pick' ? 110 : example.scenario === 'long-haul' ? 135 : 230,
      );
    } finally {
      store.close();
    }
  }
});
test('availability recovery requires the requested attempt and resets identically', () => {
  const store = new RunStore(':memory:');
  try {
    const { run, token } = store.create(2, 'agent', 'stock-recovery');
    store.action(run.id, token, { type: 'inspect', itemId: 'cloud' });
    store.action(run.id, token, { type: 'checkout' });
    assert.equal(store.purchase(run.id, token, purchase('cloud')).status, 409);
    store.action(run.id, token, { type: 'inspect', itemId: 'orbit' });
    store.action(run.id, token, { type: 'checkout' });
    assert.equal(
      store.purchase(run.id, token, purchase('orbit', { submissionId: 'second-attempt' })).run
        .result?.correct,
      true,
    );
    const fresh = store.reset(run.id, token);
    assert.deepEqual(fresh.run.mission, run.mission);
    assert.equal(fresh.run.scenarioVersion, run.scenarioVersion);
    const direct = store.create(2, 'agent', 'stock-recovery');
    store.action(direct.run.id, direct.token, { type: 'inspect', itemId: 'orbit' });
    store.action(direct.run.id, direct.token, { type: 'checkout' });
    assert.equal(
      store.purchase(direct.run.id, direct.token, purchase()).run.result?.correct,
      false,
    );
  } finally {
    store.close();
  }
});
test('scenario IDs are validated and per-run time limits are enforced', () => {
  let clock = 0;
  const store = new RunStore(':memory:', () => clock);
  try {
    assert.throws(() => store.create(1, 'agent', 'made-up'), isStatus(400));
    const { run, token } = store.create(1, 'agent', 'budget-pick', 60000);
    assert.equal(run.limitMs, 60000);
    store.action(run.id, token, { type: 'inspect', itemId: 'echo' });
    store.action(run.id, token, { type: 'checkout' });
    clock = 60001;
    assert.throws(() => store.purchase(run.id, token, purchase('echo')), isStatus(409));
  } finally {
    store.close();
  }
});
