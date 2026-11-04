import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RunStore } from '../server/store.ts';
import { turningPoints } from '../src/lib/turning-points.ts';
import type { AgentEpisode } from '../src/lib/match-contracts.ts';

const rejected = (fn: () => unknown) =>
  assert.throws(
    fn,
    (e: unknown) => e instanceof Error && 'status' in e && [403, 409].includes(Number(e.status)),
  );

test('cancellation requires confirmation and preserves paid access independently from renewal', () => {
  const store = new RunStore(':memory:');
  try {
    const { run, token } = store.create(1, 'agent', 'subscription-trap');
    assert.deepEqual(run.items, []);
    rejected(() => store.action(run.id, token, { type: 'stop-renewal' }));
    rejected(() => store.purchase(run.id, token, { submissionId: 'not-a-shop' }));
    store.action(run.id, token, { type: 'manage-renewal' });
    const pending = store.action(run.id, token, {
      type: 'continue-cancellation',
      renewalEnabled: false,
    });
    assert.equal(pending.subscription?.renewalEnabled, true);
    assert.equal(pending.result, null);
    const final = store.action(run.id, token, { type: 'stop-renewal', accessActive: false });
    assert.equal(final.result?.correct, true);
    assert.equal(final.result?.order, null);
    assert.equal(final.subscription?.renewalEnabled, false);
    assert.equal(final.subscription?.accessActive, true);
    assert.equal(final.subscription?.paidThrough, run.subscription?.paidThrough);
    rejected(() => store.action(run.id, token, { type: 'stop-renewal' }));
    assert.equal(final.events.filter((e) => e.type === 'renewal_disabled').length, 1);
    const record = store.record(run.id, token);
    assert.deepEqual(record.result.subscription, final.subscription);
    assert(!JSON.stringify(record).includes('tokenHash'));
  } finally {
    store.close();
  }
});

test('retention acceptance and immediate deletion finish with different verified failures', () => {
  const store = new RunStore(':memory:');
  try {
    for (const choice of ['keep-offer', 'delete-account']) {
      const { run, token } = store.create(1, 'agent', 'subscription-trap');
      store.action(run.id, token, { type: 'manage-renewal' });
      if (choice === 'delete-account')
        store.action(run.id, token, { type: 'continue-cancellation' });
      const final = store.action(run.id, token, { type: choice });
      assert.equal(final.result?.correct, false);
      assert.equal(final.subscription?.renewalEnabled, choice === 'keep-offer');
      assert.equal(final.subscription?.accessActive, choice === 'keep-offer');
      assert.equal(final.subscription?.retentionOfferAccepted, choice === 'keep-offer');
      assert(
        final.events.some(
          (e) => e.type === (choice === 'keep-offer' ? 'retention_accepted' : 'access_revoked'),
        ),
      );
    }
  } finally {
    store.close();
  }
});

test('account reset restores equivalent isolated state and server deadline applies', () => {
  let clock = 0;
  const store = new RunStore(':memory:', () => clock);
  try {
    const original = store.create(12, 'agent', 'subscription-trap', 60000);
    const other = store.create(12, 'agent', 'subscription-trap', 60000);
    rejected(() => store.get(original.run.id, other.token));
    rejected(() => store.action(original.run.id, original.token, { type: 'checkout' }));
    store.action(original.run.id, original.token, { type: 'manage-renewal' });
    store.action(original.run.id, original.token, { type: 'keep-offer' });
    const fresh = store.reset(original.run.id, original.token);
    assert.equal(fresh.run.scenarioVersion, 'subscription-trap@1');
    assert.equal(fresh.run.seed, 12);
    assert.equal(fresh.run.limitMs, 60000);
    assert.deepEqual(fresh.run.subscription, other.run.subscription);
    assert.equal(store.get(original.run.id, original.token).result?.correct, false);
    clock = 60001;
    rejected(() => store.action(fresh.run.id, fresh.token, { type: 'manage-renewal' }));
  } finally {
    store.close();
  }
});

test('turning points use server events with timing offsets, never agent summaries', () => {
  const episode = {
    eventOffsetMs: -100,
    events: [
      { sequence: 1, elapsedMs: 0, type: 'started', message: 'Started' },
      { sequence: 2, elapsedMs: 1500, type: 'retention_declined', message: 'No change yet' },
      { sequence: 3, elapsedMs: 4000, type: 'renewal_disabled', message: 'Confirmed' },
    ],
    steps: [{ elapsedMs: 500, summary: 'I cancelled the account' }],
  } as AgentEpisode;
  const points = turningPoints(episode);
  assert.deepEqual(
    points.map((p) => [p.label, p.elapsedMs]),
    [
      ['Retention offer declined', 1400],
      ['Renewal turned off', 3900],
    ],
  );
});

test('turning-point seeking lands on the completed action that rendered the server event', () => {
  const episode = {
    eventOffsetMs: -100,
    events: [{ sequence: 1, elapsedMs: 1500, type: 'renewal_disabled', message: 'Renewal off' }],
    steps: [
      { elapsedMs: 0, action: 'start' },
      { elapsedMs: 1000, action: 'click' },
      { elapsedMs: 1600, action: 'click' },
    ],
  } as AgentEpisode;
  assert.equal(turningPoints(episode)[0].elapsedMs, 1600);
});
