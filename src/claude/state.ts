// Parsing of ~/.quran-for-claude-code/state, written by our Claude Code hooks.
// Format: "busy <unix-seconds>" or "idle <unix-seconds>". Pure; unit-tested.

export type ClaudeActivity = 'busy' | 'idle';

export interface ClaudeState {
  activity: ClaudeActivity;
  /** Unix seconds from the file, or undefined if the file is missing/unreadable. */
  timestamp?: number;
}

export const IDLE: ClaudeState = { activity: 'idle' };

/**
 * Interpret the state file. Anything unexpected counts as idle, and a "busy" older than
 * `staleMinutes` counts as idle too (protects against a missed Stop/SessionEnd hook).
 */
export function parseState(content: string | undefined, nowSeconds: number, staleMinutes: number): ClaudeState {
  if (content === undefined) return IDLE;
  const m = /^\s*(busy|idle)\s+(\d{1,12})\s*$/.exec(content);
  if (!m) return IDLE;
  const timestamp = Number(m[2]);
  if (m[1] === 'idle') return { activity: 'idle', timestamp };
  if (nowSeconds - timestamp > staleMinutes * 60) return { activity: 'idle', timestamp };
  return { activity: 'busy', timestamp };
}
