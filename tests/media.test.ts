import { test } from 'node:test';
import assert from 'node:assert/strict';
import { byteRange } from '../server/media.ts';
test('video range requests support full, open-ended and suffix requests', () => {
  assert.equal(byteRange(undefined, 1000), null);
  assert.deepEqual(byteRange('bytes=0-99', 1000), { start: 0, end: 99 });
  assert.deepEqual(byteRange('bytes=500-', 1000), { start: 500, end: 999 });
  assert.deepEqual(byteRange('bytes=-200', 1000), { start: 800, end: 999 });
  assert.deepEqual(byteRange('bytes=0-9999', 1000), { start: 0, end: 999 });
});
test('malformed or unsatisfiable video ranges are rejected', () => {
  for (const value of [
    'bytes=1000-',
    'bytes=20-10',
    'bytes=-0',
    'bytes=-',
    'bytes=0-10,20-30',
    'nonsense',
  ])
    assert.equal(byteRange(value, 1000), false);
});
