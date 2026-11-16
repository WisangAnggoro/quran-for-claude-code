import assert from 'node:assert/strict';
import { parseState, stateFilePath } from '../src/claude/state';

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

describe('stateFilePath', () => {
  it('uses $HOME on POSIX and %USERPROFILE% on Windows', () => {
    assert.equal(stateFilePath('linux', { USERPROFILE: 'C:\\Users\\x' }, '/home/u'), '/home/u/.quran-for-claude-code/state');
    assert.equal(stateFilePath('darwin', {}, '/Users/u'), '/Users/u/.quran-for-claude-code/state');
    assert.equal(stateFilePath('win32', { USERPROFILE: 'C:\\Users\\x' }, 'D:\\home'), 'C:\\Users\\x\\.quran-for-claude-code\\state');
    assert.equal(stateFilePath('win32', {}, 'C:\\Users\\y'), 'C:\\Users\\y\\.quran-for-claude-code\\state');
  });
});
