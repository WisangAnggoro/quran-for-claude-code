import assert from 'node:assert/strict';
import {
  BUSY_COMMAND,
  HOOK_TAG,
  HOOK_VARIANTS,
  HookConfigError,
  IDLE_COMMAND,
  hookCommand,
  hookEntry,
  hooksInstalled,
  installedVariant,
  installHooks,
  uninstallHooks,
} from '../src/claude/hooks';

const theirs = (cmd: string) => ({ type: 'command', command: cmd });

/** Shaped like a real user's settings: other keys, a matcher group, an existing Stop hook. */
function realistic() {
  return {
    model: 'opus',
    theme: 'dark',
    hooks: {
      Notification: [{ matcher: 'permission_prompt|idle_prompt', hooks: [theirs('notify-send hi')] }],
      Stop: [{ hooks: [theirs('afplay done.wav')] }],
      SubagentStop: [{ hooks: [theirs('echo sub')] }],
    },
  };
}

describe('hook commands', () => {
  it('are tagged, write via temp file + rename, and differ only in activity', () => {
    for (const c of [BUSY_COMMAND, IDLE_COMMAND]) {
      assert.ok(c.endsWith(`# ${HOOK_TAG}`));
      assert.match(c, /> "\$d\/state\.tmp" && mv -f "\$d\/state\.tmp" "\$d\/state"/);
    }
    assert.match(BUSY_COMMAND, /printf 'busy %s'/);
    assert.equal(IDLE_COMMAND, BUSY_COMMAND.replace("'busy %s'", "'idle %s'"));
  });
});

describe('installHooks', () => {
  it('adds our hooks to an empty object', () => {
    const { settings, changed } = installHooks({});
    assert.equal(changed, true);
    assert.deepEqual(settings, {
      hooks: {
        UserPromptSubmit: [{ hooks: [theirs(BUSY_COMMAND)] }],
        Stop: [{ hooks: [theirs(IDLE_COMMAND)] }],
        SessionEnd: [{ hooks: [theirs(IDLE_COMMAND)] }],
      },
    });
  });

  it('appends next to existing hooks and keeps every other key untouched', () => {
    const before = realistic();
    const { settings } = installHooks(before);
    const s = settings as ReturnType<typeof realistic> & { hooks: Record<string, unknown[]> };
    assert.equal(s.model, 'opus');
    assert.equal(s.theme, 'dark');
    assert.deepEqual(s.hooks.Notification, before.hooks.Notification);
    assert.deepEqual(s.hooks.SubagentStop, before.hooks.SubagentStop);
    assert.deepEqual(s.hooks.Stop, [before.hooks.Stop[0], { hooks: [theirs(IDLE_COMMAND)] }]);
    assert.equal(hooksInstalled(s), true);
  });

  it('does not mutate its input', () => {
    const before = realistic();
    const copy = structuredClone(before);
    installHooks(before);
    assert.deepEqual(before, copy);
  });

  it('is idempotent', () => {
    const once = installHooks(realistic()).settings;
    const twice = installHooks(once);
    assert.equal(twice.changed, false);
    assert.deepEqual(twice.settings, once);
  });

  it('replaces an older version of our hooks instead of duplicating', () => {
    const old = installHooks({}).settings as { hooks: Record<string, { hooks: { command: string }[] }[]> };
    old.hooks.Stop[0].hooks[0].command = `echo old # ${HOOK_TAG}`;
    const { settings, changed } = installHooks(old);
    assert.equal(changed, true);
    assert.deepEqual((settings as typeof old).hooks.Stop, [{ hooks: [theirs(IDLE_COMMAND)] }]);
  });

  it('refuses shapes it does not understand', () => {
    for (const bad of [[], 'x', null, { hooks: [] }, { hooks: { Stop: {} } }, { hooks: { Stop: [{ command: 'x' }] } }]) {
      assert.throws(() => installHooks(bad), HookConfigError, JSON.stringify(bad));
    }
  });
});

describe('uninstallHooks', () => {
  it('restores the original settings exactly', () => {
    const before = realistic();
    const { settings, changed } = uninstallHooks(installHooks(before).settings);
    assert.equal(changed, true);
    assert.deepEqual(settings, before);
  });

  it('removes the hooks object only if we emptied it', () => {
    assert.deepEqual(uninstallHooks(installHooks({ a: 1 }).settings).settings, { a: 1 });
  });

  it('keeps a group that mixes our entry with someone else\'s', () => {
    const mixed = { hooks: { Stop: [{ hooks: [theirs('mine'), theirs(IDLE_COMMAND)] }] } };
    assert.deepEqual(uninstallHooks(mixed).settings, { hooks: { Stop: [{ hooks: [theirs('mine')] }] } });
  });

  it('is a no-op when nothing of ours is present', () => {
    const r = uninstallHooks(realistic());
    assert.equal(r.changed, false);
    assert.deepEqual(r.settings, realistic());
  });
});

describe('hook variants', () => {
  it('every variant is tagged and writes busy/idle', () => {
    for (const v of HOOK_VARIANTS) {
      for (const a of ['busy', 'idle'] as const) {
        const c = hookCommand(v, a);
        assert.ok(c.endsWith(`# ${HOOK_TAG}`), `${v} ${a}`);
        assert.ok(c.includes(`'${a} `), `${v} ${a}`);
      }
    }
  });
  it('posix is unchanged so existing installs still count as installed', () => {
    assert.equal(hookCommand('posix', 'busy'), BUSY_COMMAND);
    assert.match(BUSY_COMMAND, /^d="\$HOME\/\.quran-for-claude-code"/);
  });
  it('Windows variants anchor to USERPROFILE', () => {
    assert.match(hookCommand('gitbash', 'busy'), /^d="\$\(cygpath -u "\$USERPROFILE"\)\/\.quran-for-claude-code"/);
    assert.match(hookCommand('powershell', 'busy'), /^\$d = Join-Path \$env:USERPROFILE '\.quran-for-claude-code'/);
  });
  it('only the PowerShell entry sets "shell"', () => {
    assert.equal(hookEntry('posix', 'busy').shell, undefined);
    assert.equal(hookEntry('gitbash', 'busy').shell, undefined);
    assert.equal(hookEntry('powershell', 'busy').shell, 'powershell');
  });
  it('installs each variant and reports which one is installed', () => {
    for (const v of HOOK_VARIANTS) {
      const s = installHooks(realistic(), v).settings;
      assert.equal(installedVariant(s), v);
      assert.equal(hooksInstalled(s, v), true);
      assert.equal(installHooks(s, v).changed, false, `${v} idempotent`);
    }
  });
  it('switching variants replaces ours and keeps theirs', () => {
    const posixInstalled = installHooks(realistic(), 'posix').settings;
    const { settings, changed } = installHooks(posixInstalled, 'powershell');
    assert.equal(changed, true);
    assert.equal(installedVariant(settings), 'powershell');
    const s = settings as { hooks: Record<string, { hooks: { command: string }[] }[]> };
    const ours = Object.values(s.hooks).flat().flatMap((g) => g.hooks).filter((h) => h.command.includes(HOOK_TAG));
    assert.equal(ours.length, 3);
    assert.deepEqual(uninstallHooks(settings).settings, realistic());
  });
  it('repairs a mix of variants', () => {
    const mixed = installHooks({}, 'gitbash').settings as { hooks: Record<string, unknown[]> };
    mixed.hooks.Stop.push({ hooks: [hookEntry('powershell', 'idle')] });
    assert.equal(installHooks(mixed, 'gitbash').changed, true);
    assert.equal(installedVariant(installHooks(mixed, 'gitbash').settings), 'gitbash');
  });
});
