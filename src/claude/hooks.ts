// Pure merge/unmerge of our hooks into a parsed ~/.claude/settings.json object.
// Never removes or edits entries we did not create; our entries are identified by HOOK_TAG.

export const HOOK_TAG = 'quran-for-claude-code';

function stateCommand(activity: 'busy' | 'idle'): string {
  return (
    `d="$HOME/.quran-for-claude-code"; mkdir -p "$d" && ` +
    `printf '${activity} %s' "$(date +%s)" > "$d/state.tmp" && mv -f "$d/state.tmp" "$d/state" # ${HOOK_TAG}`
  );
}

export const BUSY_COMMAND = stateCommand('busy');
export const IDLE_COMMAND = stateCommand('idle');

/** Claude Code hook events we register, and the command each runs. */
export const OUR_HOOKS: Readonly<Record<string, string>> = {
  UserPromptSubmit: BUSY_COMMAND,
  Stop: IDLE_COMMAND,
  SessionEnd: IDLE_COMMAND,
};

export class HookConfigError extends Error {}

type Json = Record<string, unknown>;
interface HookEntry {
  type?: unknown;
  command?: unknown;
}
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

/** True when every one of our hooks is present with the current command. */
export function hooksInstalled(settings: unknown): boolean {
  const hooks = hooksObject(settings);
  return Object.entries(OUR_HOOKS).every(([event, command]) =>
    groupsOf(hooks, event).some((g) => (g.hooks as HookEntry[]).some((h) => isOurs(h) && h.command === command)),
  );
}

export interface MergeResult {
  settings: Json;
  changed: boolean;
}

/**
 * Add our hooks (or update an older version of them). Returns a new object; the input
 * is not mutated. Idempotent: installing twice reports `changed: false`.
 */
export function installHooks(settings: unknown): MergeResult {
  if (hooksInstalled(settings)) return { settings: structuredClone(settings as Json), changed: false };
  const next = removeOurs(structuredClone(settings as Json));
  const hooks = (next.hooks ??= {}) as Json;
  for (const [event, command] of Object.entries(OUR_HOOKS)) {
    const groups = (hooks[event] ??= []) as HookGroup[];
    groups.push({ hooks: [{ type: 'command', command }] });
  }
  return { settings: next, changed: true };
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
