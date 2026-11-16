// Safe read/modify/write of Claude Code's settings.json (AGENTS.md rule 3):
// abort on invalid JSON, back up before any write, write via temp file + rename,
// and skip writing entirely when nothing changes. No VS Code import.

import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { HookConfigError, type MergeResult } from './hooks';

export function claudeSettingsPath(env: NodeJS.ProcessEnv = process.env, home: string = homedir()): string {
  return join(env.CLAUDE_CONFIG_DIR || join(home, '.claude'), 'settings.json');
}

export interface SettingsFile {
  exists: boolean;
  data: unknown;
  /** Exact original text, used to keep indentation and trailing newline. */
  text?: string;
}

export async function readSettingsFile(path: string): Promise<SettingsFile> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { exists: false, data: {} };
    throw err;
  }
  // Windows editors often save JSON with a UTF-8 BOM; it is not part of the JSON.
  const json = text.startsWith('\uFEFF') ? text.slice(1) : text;
  if (json.trim() === '') return { exists: true, data: {}, text };
  try {
    return { exists: true, data: JSON.parse(json), text };
  } catch {
    throw new HookConfigError(`${path} is not valid JSON, so it was left unchanged. Fix it and try again.`);
  }
}

function timestamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function indentOf(text: string | undefined): string | number {
  const m = text ? /^[ \t]+(?=")/m.exec(text) : null;
  return m ? m[0] : 2;
}

export interface ApplyResult {
  changed: boolean;
  /** Path of the backup made before writing, if the file existed. */
  backup?: string;
}

export async function applyToSettingsFile(
  path: string,
  change: (settings: unknown) => MergeResult,
  now: Date = new Date(),
): Promise<ApplyResult> {
  const file = await readSettingsFile(path);
  const result = change(file.data);
  if (!result.changed) return { changed: false };

  let backup: string | undefined;
  if (file.exists) {
    backup = `${path}.bak-${timestamp(now)}`;
    await copyFile(path, backup);
  }
  const trailingNewline = file.text === undefined || file.text.endsWith('\n') ? '\n' : '';
  const bom = file.text?.startsWith('\uFEFF') ? '\uFEFF' : '';
  const out = bom + JSON.stringify(result.settings, null, indentOf(file.text)) + trailingNewline;
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  await writeFile(tmp, out, 'utf8');
  await rename(tmp, path);
  return { changed: true, backup };
}
