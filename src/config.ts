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
