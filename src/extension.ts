import * as vscode from 'vscode';
import { maybeOfferHooks } from './claude/hookCommands';
import { ClaudeIntegration } from './claude/integration';
import { registerCommands } from './commands';
import { ReaderController } from './controller';
import { QuranStore } from './quran/store';
import { ReaderViewProvider } from './view/ReaderViewProvider';
import { StatusBar } from './view/StatusBar';

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
  const statusBar = new StatusBar(controller);
  const claude = new ClaudeIntegration(context.globalState, controller, provider, statusBar);

  context.subscriptions.push(
    controller,
    provider,
    vscode.window.registerWebviewViewProvider(ReaderViewProvider.viewId, provider),
    statusBar,
    claude,
    ...registerCommands(controller, provider, store),
  );
  void claude.start();
  // Delay so the offer never competes with VS Code's own startup notifications.
  const offer = setTimeout(() => void maybeOfferHooks(context.globalState), 5000);
  context.subscriptions.push({ dispose: () => clearTimeout(offer) });
}

export function deactivate(): void {
  // Disposables are released via context.subscriptions.
}
