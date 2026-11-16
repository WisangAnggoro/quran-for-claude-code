import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HookConfigError, hooksInstalled, installHooks, uninstallHooks } from '../src/claude/hooks';
import { applyToSettingsFile, claudeSettingsPath, readSettingsFile } from '../src/claude/settingsFile';

describe('claudeSettingsPath', () => {
  it('uses ~/.claude unless CLAUDE_CONFIG_DIR is set', () => {
    assert.equal(claudeSettingsPath({}, '/home/u'), join('/home/u', '.claude', 'settings.json'));
    assert.equal(claudeSettingsPath({ CLAUDE_CONFIG_DIR: '/cfg' }, '/home/u'), join('/cfg', 'settings.json'));
  });
});

describe('applyToSettingsFile', () => {
  let dir: string;
  let path: string;
  const when = new Date(2026, 10, 16, 14, 5, 9);
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'qfcc-settings-'));
    path = join(dir, '.claude', 'settings.json');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const files = () => readdirSync(join(dir, '.claude')).sort();
  const seed = (text: string) => {
    mkdirSync(join(dir, '.claude'), { recursive: true });
    writeFileSync(path, text);
  };

  it('creates the file (and folder) when missing, with no backup', async () => {
    const r = await applyToSettingsFile(path, installHooks, when);
    assert.deepEqual(r, { changed: true, backup: undefined });
    assert.equal((await readSettingsFile(path)).exists, true);
    assert.deepEqual(files(), ['settings.json']);
  });

  it('backs up the exact original before writing', async () => {
    const original = '{\n    "model": "opus"\n}\n';
    seed(original);
    const r = await applyToSettingsFile(path, installHooks, when);
    assert.equal(r.backup, `${path}.bak-20261116-140509`);
    assert.equal(readFileSync(r.backup ?? '', 'utf8'), original);
    const written = readFileSync(path, 'utf8');
    assert.match(written, /^\{\n {4}"model": "opus",/, 'keeps 4-space indent');
    assert.ok(written.endsWith('}\n'));
    assert.deepEqual(files(), ['settings.json', 'settings.json.bak-20261116-140509']);
  });

  it('does not write or back up when nothing changes', async () => {
    await applyToSettingsFile(path, installHooks, when);
    const before = readFileSync(path, 'utf8');
    const r = await applyToSettingsFile(path, installHooks, new Date(2026, 10, 16, 15, 0, 0));
    assert.deepEqual(r, { changed: false });
    assert.equal(readFileSync(path, 'utf8'), before);
    assert.deepEqual(files(), ['settings.json']);
  });

  it('aborts on invalid JSON and leaves the file untouched', async () => {
    seed('{ "model": "opus", }');
    await assert.rejects(applyToSettingsFile(path, installHooks, when), HookConfigError);
    assert.equal(readFileSync(path, 'utf8'), '{ "model": "opus", }');
    assert.deepEqual(files(), ['settings.json']);
  });

  it('accepts a UTF-8 BOM (common on Windows) and keeps it when writing', async () => {
    seed('\uFEFF{\n  "model": "opus"\n}\n');
    const r = await applyToSettingsFile(path, installHooks, when);
    assert.equal(r.changed, true);
    const written = readFileSync(path, 'utf8');
    assert.ok(written.startsWith('\uFEFF{'), 'BOM kept');
    assert.equal(hooksInstalled((await readSettingsFile(path)).data), true);
  });

  it('round-trips install then uninstall back to the same data', async () => {
    const data = { model: 'opus', hooks: { Stop: [{ hooks: [{ type: 'command', command: 'mine' }] }] } };
    seed(JSON.stringify(data, null, 2) + '\n');
    await applyToSettingsFile(path, installHooks, when);
    await applyToSettingsFile(path, uninstallHooks, new Date(2026, 10, 16, 14, 6, 0));
    assert.deepEqual((await readSettingsFile(path)).data, data);
  });
});
