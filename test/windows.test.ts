import assert from 'node:assert/strict';
import { findGitBash } from '../src/claude/windows';

describe('findGitBash', () => {
  const env = {
    ProgramFiles: 'C:\\Program Files',
    'ProgramFiles(x86)': 'C:\\Program Files (x86)',
    LOCALAPPDATA: 'C:\\Users\\x\\AppData\\Local',
  };
  it('prefers CLAUDE_CODE_GIT_BASH_PATH', () => {
    const p = 'D:\\tools\\git\\bin\\bash.exe';
    assert.equal(findGitBash({ ...env, CLAUDE_CODE_GIT_BASH_PATH: p }, () => true), p);
  });
  it('checks the usual install locations in order', () => {
    const only = (want: string) => (p: string) => p === want;
    assert.equal(findGitBash(env, only('C:\\Program Files\\Git\\bin\\bash.exe')), 'C:\\Program Files\\Git\\bin\\bash.exe');
    assert.equal(
      findGitBash(env, only('C:\\Users\\x\\AppData\\Local\\Programs\\Git\\bin\\bash.exe')),
      'C:\\Users\\x\\AppData\\Local\\Programs\\Git\\bin\\bash.exe',
    );
  });
  it('returns undefined when nothing exists', () => {
    assert.equal(findGitBash(env, () => false), undefined);
    assert.equal(findGitBash({}, () => true), undefined);
  });
});
