import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkpointLabel } from '../src/lib/checkpoints.ts';
import type { AgentEpisode, AgentStep } from '../src/lib/match-contracts.ts';
test('new control labels describe return navigation and legacy records use verified events', () => {
  const episode = {
    steps: [
      { elapsedMs: 0, action: 'start' },
      { elapsedMs: 1000, action: 'click' },
    ],
    events: [{ sequence: 1, elapsedMs: 500, type: 'browse', message: 'Returned to the store.' }],
  } as AgentEpisode;
  assert.equal(
    checkpointLabel(
      episode,
      { action: 'click', elapsedMs: 1000, label: 'Close checkout' } as AgentStep,
      1,
    ),
    'Return to product details',
  );
  assert.equal(checkpointLabel(episode, episode.steps[1], 1), 'Return to products');
  assert.equal(
    checkpointLabel({ ...episode, events: [] }, episode.steps[1], 1),
    'Interact with page',
  );
});
