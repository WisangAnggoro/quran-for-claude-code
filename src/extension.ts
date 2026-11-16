import * as vscode from 'vscode';
import { ReaderController } from './controller';
import { QuranStore } from './quran/store';
import { ReaderViewProvider } from './view/ReaderViewProvider';

const BOOKMARK_KEY = 'bookmark';

/**
 * Entry point. Keep this cheap: nothing here reads the data files.
 * Quran data is loaded lazily on first panel render.
 */
export function activate(context: vscode.ExtensionContext): void {
  const store = new QuranStore(vscode.Uri.joinPath(context.extensionUri, 'data').fsPath);
  const controller = new ReaderController(store, {
    get: () => context.globalState.get(BOOKMARK_KEY),
    set: (index) => void context.globalState.update(BOOKMARK_KEY, index),
  });
  const provider = new ReaderViewProvider(context.extensionUri, controller);

  context.subscriptions.push(
    controller,
    provider,
    vscode.window.registerWebviewViewProvider(ReaderViewProvider.viewId, provider),
  );
}

export function deactivate(): void {
  // Disposables are released via context.subscriptions.
}
