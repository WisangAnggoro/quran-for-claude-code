// Reads/writes quranForClaudeCode.* settings. Thin VS Code layer over pure logic in session.ts.

import * as vscode from 'vscode';
import { clampFontSize, resolveTranslation, type ReaderSettings } from './session';

export const SECTION = 'quranForClaudeCode';

export function readSettings(): ReaderSettings {
  const c = vscode.workspace.getConfiguration(SECTION);
  return {
    mode: c.get('mode') === 'random' ? 'random' : 'continuous',
    translation: resolveTranslation(c.get('translation')),
    showTranslation: c.get('showTranslation', true),
    arabicFontSize: clampFontSize(c.get('arabicFontSize')),
    navigationDirection: c.get('navigationDirection') === 'rtl' ? 'rtl' : 'ltr',
  };
}

/**
 * Mirror reader settings into context keys so the panel title bar shows the right
 * toggle icons (e.g. eye vs eye-closed). See `menus.view/title` in package.json.
 */
export function syncContextKeys(s: ReaderSettings): void {
  void vscode.commands.executeCommand('setContext', 'quranForClaudeCode.mode', s.mode);
  void vscode.commands.executeCommand('setContext', 'quranForClaudeCode.showTranslation', s.showTranslation);
  void vscode.commands.executeCommand('setContext', 'quranForClaudeCode.translationAvailable', s.translation !== 'none');
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
