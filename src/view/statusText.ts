// Pure formatting for the status bar item (no VS Code import, unit-tested).

import type { Mode } from '../reader';

export interface StatusState {
  enabled: boolean;
  busy: boolean;
  mode: Mode;
  bookmarkRef?: string;
}

export function statusText(s: StatusState): string {
  const icon = s.enabled && s.busy ? '$(book) $(loading~spin)' : '$(book)';
  return `${icon} Quran: ${s.enabled ? 'On' : 'Off'}`;
}

export function statusTooltip(s: StatusState): string {
  const mode = s.mode === 'random' ? 'Random' : 'Continuous';
  const bookmark = s.bookmarkRef ? ` · bookmark ${s.bookmarkRef}` : '';
  const action = s.enabled ? 'Click to turn off' : 'Click to turn on';
  return `Quran for Claude Code (Unofficial)\n${mode}${bookmark}\n${action}`;
}
