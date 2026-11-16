// Reads/writes quranForClaudeCode.* settings. Thin VS Code layer over pure logic in session.ts.

import * as vscode from 'vscode';
import { clampFontSize, resolveTranslation, type ReaderSettings } from './session';

export const SECTION = 'quranForClaudeCode';

export function readSettings(): ReaderSettings {
  const c = vscode.workspace.getConfiguration(SECTION);
  const t = c.inspect<string>('translation');
  const explicit = [t?.globalValue, t?.workspaceValue, t?.workspaceFolderValue].some((v) => v !== undefined);
  return {
    mode: c.get('mode') === 'random' ? 'random' : 'continuous',
    translation: resolveTranslation(c.get('translation'), explicit, vscode.env.language),
    showTranslation: c.get('showTranslation', true),
    arabicFontSize: clampFontSize(c.get('arabicFontSize')),
  };
}

export function updateSetting(key: keyof ReaderSettings, value: unknown): Thenable<void> {
  return vscode.workspace.getConfiguration(SECTION).update(key, value, vscode.ConfigurationTarget.Global);
}

/** Settings outside the panel's rendering: on/off and Claude Code integration. */
export interface ExtensionSettings {
  enabled: boolean;
  autoReveal: boolean;
  advanceOnNewTurn: boolean;
  staleBusyMinutes: number;
}

export function readExtensionSettings(): ExtensionSettings {
  const c = vscode.workspace.getConfiguration(SECTION);
  const stale = c.get<number>('staleBusyMinutes', 30);
  return {
    enabled: c.get('enabled', true),
    autoReveal: c.get('autoReveal', true),
    advanceOnNewTurn: c.get('advanceOnNewTurn', true),
    staleBusyMinutes: Number.isFinite(stale) && stale >= 1 ? stale : 30,
  };
}

export function setEnabled(enabled: boolean): Thenable<void> {
  return vscode.workspace.getConfiguration(SECTION).update('enabled', enabled, vscode.ConfigurationTarget.Global);
}
