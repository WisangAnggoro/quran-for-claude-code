import * as vscode from 'vscode';
import { readExtensionSettings } from '../config';
import type { ReaderController } from '../controller';
import { showsBusy, statusText, statusTooltip } from './statusText';

/** Contributed in package.json (contributes.colors); users can override it. */
const BUSY_COLOR = new vscode.ThemeColor('quranForClaudeCode.statusBarBusyForeground');

export class StatusBar implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(
    'quranForClaudeCode.status',
    vscode.StatusBarAlignment.Right,
    100,
  );
  private busy = false;
  private readonly subscriptions: vscode.Disposable[];

  constructor(private readonly controller: ReaderController) {
    this.item.name = 'Quran for Claude Code';
    this.item.command = 'quranForClaudeCode.toggle';
    this.subscriptions = [
      this.item,
      controller.onDidChange(() => void this.update()),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('quranForClaudeCode.enabled')) void this.update();
      }),
    ];
    void this.update();
    this.item.show();
  }

  /** Set by the Claude Code state watcher (Phase 5). */
  setBusy(busy: boolean): void {
    if (busy === this.busy) return;
    this.busy = busy;
    void this.update();
  }

  private async update(): Promise<void> {
    const { enabled } = readExtensionSettings();
    const { mode, bookmarkRef } = await this.controller.describe();
    const state = { enabled, busy: this.busy, mode, bookmarkRef };
    this.item.text = statusText(state);
    this.item.tooltip = statusTooltip(state);
    this.item.color = showsBusy(state) ? BUSY_COLOR : undefined;
  }

  dispose(): void {
    for (const d of this.subscriptions) d.dispose();
  }
}
