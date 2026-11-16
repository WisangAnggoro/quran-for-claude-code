// Windows-only helpers for choosing a hook variant. Pure apart from the injected `exists`.

import { win32 } from 'node:path';

/**
 * Locate Git for Windows' bash.exe the way Claude Code does: CLAUDE_CODE_GIT_BASH_PATH first,
 * then the usual install locations. Returns undefined if none exists.
 */
export function findGitBash(env: Record<string, string | undefined>, exists: (path: string) => boolean): string | undefined {
  const candidates = [
    env.CLAUDE_CODE_GIT_BASH_PATH,
    env.ProgramFiles && win32.join(env.ProgramFiles, 'Git', 'bin', 'bash.exe'),
    env['ProgramFiles(x86)'] && win32.join(env['ProgramFiles(x86)'], 'Git', 'bin', 'bash.exe'),
    env.LOCALAPPDATA && win32.join(env.LOCALAPPDATA, 'Programs', 'Git', 'bin', 'bash.exe'),
  ];
  return candidates.find((p): p is string => typeof p === 'string' && p !== '' && exists(p));
}
