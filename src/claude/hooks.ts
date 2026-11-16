// Pure merge/unmerge of our hooks into a parsed ~/.claude/settings.json object.
// Never removes or edits entries we did not create; our entries are identified by HOOK_TAG.

export const HOOK_TAG = 'quran-for-claude-code';

/**
 * How the hook command is written:
 * - posix: macOS, Linux, WSL (`sh -c`), state under $HOME.
 * - gitbash: native Windows with Git Bash (Claude Code's default there), state under %USERPROFILE%.
 * - powershell: native Windows via PowerShell (`"shell": "powershell"`), state under %USERPROFILE%.
 * On Windows both variants anchor to %USERPROFILE% because $HOME in Git Bash may differ.
 */
export type HookVariant = 'posix' | 'gitbash' | 'powershell';
export const HOOK_VARIANTS: readonly HookVariant[] = ['posix', 'gitbash', 'powershell'];

type Activity = 'busy' | 'idle';

export function hookCommand(variant: HookVariant, activity: Activity): string {
  switch (variant) {
    case 'posix':
      return (
        `d="$HOME/.quran-for-claude-code"; mkdir -p "$d" && ` +
        `printf '${activity} %s' "$(date +%s)" > "$d/state.tmp" && mv -f "$d/state.tmp" "$d/state" # ${HOOK_TAG}`
      );
    case 'gitbash':
      return (
        `d="$(cygpath -u "$USERPROFILE")/.quran-for-claude-code"; mkdir -p "$d" && ` +
        `printf '${activity} %s' "$(date +%s)" > "$d/state.tmp" && mv -f "$d/state.tmp" "$d/state" # ${HOOK_TAG}`
      );
    case 'powershell':
      return (
        `$d = Join-Path $env:USERPROFILE '.quran-for-claude-code'; ` +
        `[void](New-Item -ItemType Directory -Force -Path $d); ` +
        `$t = Join-Path $d 'state.tmp'; ` +
        `[IO.File]::WriteAllText($t, '${activity} ' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()); ` +
        `Move-Item -LiteralPath $t -Destination (Join-Path $d 'state') -Force # ${HOOK_TAG}`
      );
  }
}

export const BUSY_COMMAND = hookCommand('posix', 'busy');
export const IDLE_COMMAND = hookCommand('posix', 'idle');

/** Claude Code hook events we register, and whether each marks Claude busy or idle. */
export const HOOK_EVENTS: Readonly<Record<string, Activity>> = {
  UserPromptSubmit: 'busy',
  Stop: 'idle',
  SessionEnd: 'idle',
};

export interface CommandHook {
  type: 'command';
  command: string;
  shell?: 'powershell';
}

export function hookEntry(variant: HookVariant, activity: Activity): CommandHook {
  const entry: CommandHook = { type: 'command', command: hookCommand(variant, activity) };
  if (variant === 'powershell') entry.shell = 'powershell';
  return entry;
}

export class HookConfigError extends Error {}

type Json = Record<string, unknown>;
interface HookGroup {
  matcher?: unknown;
  hooks?: unknown;
}

function isObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isOurs(entry: unknown): boolean {
  return isObject(entry) && typeof entry.command === 'string' && entry.command.includes(HOOK_TAG);
}

/** Validate the parts of the file we touch; throw instead of guessing. */
function hooksObject(settings: unknown): Json | undefined {
  if (!isObject(settings)) throw new HookConfigError('settings.json is not a JSON object.');
  if (settings.hooks === undefined) return undefined;
  if (!isObject(settings.hooks)) throw new HookConfigError('"hooks" in settings.json is not an object.');
  for (const [event, groups] of Object.entries(settings.hooks)) {
    if (!Array.isArray(groups)) throw new HookConfigError(`"hooks.${event}" is not an array.`);
    for (const g of groups) {
      if (!isObject(g) || !Array.isArray((g as HookGroup).hooks)) {
        throw new HookConfigError(`"hooks.${event}" contains an entry without a "hooks" array.`);
      }
    }
  }
  return settings.hooks;
}

function groupsOf(hooks: Json | undefined, event: string): HookGroup[] {
  return (hooks?.[event] as HookGroup[] | undefined) ?? [];
}

function sameEntry(entry: unknown, expected: CommandHook): boolean {
  if (!isObject(entry)) return false;
  return entry.type === expected.type && entry.command === expected.command && entry.shell === expected.shell;
}

/** Which variant is fully installed with the current commands, if any. */
export function installedVariant(settings: unknown): HookVariant | undefined {
  const hooks = hooksObject(settings);
  return HOOK_VARIANTS.find((variant) =>
    Object.entries(HOOK_EVENTS).every(([event, activity]) =>
      groupsOf(hooks, event).some((g) => (g.hooks as unknown[]).some((h) => sameEntry(h, hookEntry(variant, activity)))),
    ),
  );
}

/** True when our hooks are installed (in the given variant, or any variant). */
export function hooksInstalled(settings: unknown, variant?: HookVariant): boolean {
  const found = installedVariant(settings);
  return variant ? found === variant : found !== undefined;
}

export interface MergeResult {
  settings: Json;
  changed: boolean;
}

/**
 * Add our hooks in the given variant, replacing any older version or other variant of
 * ours. Returns a new object; the input is not mutated. Idempotent per variant.
 */
export function installHooks(settings: unknown, variant: HookVariant = 'posix'): MergeResult {
  if (hooksInstalled(settings, variant) && !hasStrayEntries(settings, variant)) {
    return { settings: structuredClone(settings as Json), changed: false };
  }
  const next = removeOurs(structuredClone(settings as Json));
  const hooks = (next.hooks ??= {}) as Json;
  for (const [event, activity] of Object.entries(HOOK_EVENTS)) {
    const groups = (hooks[event] ??= []) as HookGroup[];
    groups.push({ hooks: [hookEntry(variant, activity)] });
  }
  return { settings: next, changed: true };
}

/** Any tagged entry that is not part of the given variant (e.g. a leftover other variant). */
function hasStrayEntries(settings: unknown, variant: HookVariant): boolean {
  const hooks = hooksObject(settings);
  if (!hooks) return false;
  return Object.entries(hooks).some(([event, groups]) =>
    (groups as HookGroup[]).some((g) =>
      (g.hooks as unknown[]).some((h) => {
        if (!isOurs(h)) return false;
        const activity = HOOK_EVENTS[event];
        return !activity || !sameEntry(h, hookEntry(variant, activity));
      }),
    ),
  );
}

/** Remove only our entries, cleaning up containers that become empty because of it. */
export function uninstallHooks(settings: unknown): MergeResult {
  const hooks = hooksObject(settings);
  const had = hooks !== undefined && Object.values(hooks).some((gs) => (gs as HookGroup[]).some((g) => (g.hooks as unknown[]).some(isOurs)));
  if (!had) return { settings: structuredClone(settings as Json), changed: false };
  return { settings: removeOurs(structuredClone(settings as Json)), changed: true };
}

function removeOurs(settings: Json): Json {
  const hooks = hooksObject(settings);
  if (!hooks) return settings;
  for (const event of Object.keys(hooks)) {
    const groups = hooks[event] as HookGroup[];
    const kept: HookGroup[] = [];
    for (const g of groups) {
      const entries = g.hooks as unknown[];
      const remaining = entries.filter((h) => !isOurs(h));
      if (remaining.length === entries.length) kept.push(g);
      else if (remaining.length > 0) kept.push({ ...g, hooks: remaining });
    }
    if (kept.length > 0) hooks[event] = kept;
    else if (groups.length > 0) Reflect.deleteProperty(hooks, event);
  }
  if (Object.keys(hooks).length === 0) delete settings.hooks;
  return settings;
}
