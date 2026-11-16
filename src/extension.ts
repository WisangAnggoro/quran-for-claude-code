import type * as vscode from 'vscode';

/**
 * Entry point. Keep this cheap: no data loading here (see AGENTS.md).
 * Quran data is loaded lazily on first panel render.
 */
export function activate(_context: vscode.ExtensionContext): void {
  // Views, commands and the Claude Code state watcher are registered in later phases.
}

export function deactivate(): void {
  // Disposables are released via context.subscriptions.
}
