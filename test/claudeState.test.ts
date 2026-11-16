import assert from 'node:assert/strict';
import { parseState } from '../src/claude/state';

const now = 1_800_000_000;

describe('parseState', () => {
  it('reads busy and idle with their timestamps', () => {
    assert.deepEqual(parseState(`busy ${now - 5}`, now, 30), { activity: 'busy', timestamp: now - 5 });
    assert.deepEqual(parseState(`idle ${now}`, now, 30), { activity: 'idle', timestamp: now });
    assert.deepEqual(parseState(`busy ${now}\n`, now, 30), { activity: 'busy', timestamp: now });
  });
  it('treats a stale busy as idle', () => {
    assert.equal(parseState(`busy ${now - 30 * 60}`, now, 30).activity, 'busy');
    assert.equal(parseState(`busy ${now - 30 * 60 - 1}`, now, 30).activity, 'idle');
  });
  it('treats missing or malformed content as idle', () => {
    for (const c of [undefined, '', 'busy', 'busy abc', 'running 123', 'busy 1 2']) {
      assert.deepEqual(parseState(c, now, 30), { activity: 'idle' }, String(c));
    }
  });
});
