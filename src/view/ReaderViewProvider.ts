// Bottom-panel webview. Strict CSP (default-src 'none'), scripts by nonce only,
// resources limited to media/. Text reaches the webview only via postMessage.

import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import * as vscode from 'vscode';
import type { ReaderController } from '../controller';

type Incoming = { type: 'ready' | 'next' | 'prev' | 'toggleMode' | 'toggleTranslation' };
const INCOMING = new Set<string>(['ready', 'next', 'prev', 'toggleMode', 'toggleTranslation']);

function isIncoming(m: unknown): m is Incoming {
  return typeof m === 'object' && m !== null && INCOMING.has((m as { type?: unknown }).type as string);
}

export class ReaderViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  static readonly viewId = 'quranForClaudeCode.reader';
  private view?: vscode.WebviewView;
  private readonly subscription: vscode.Disposable;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly controller: ReaderController,
  ) {
    this.subscription = controller.onDidChange(() => void this.render());
  }

  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.view = view;
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    view.webview.options = { enableScripts: true, localResourceRoots: [media] };
    view.onDidDispose(() => {
      if (this.view === view) this.view = undefined;
    });
    view.webview.onDidReceiveMessage((m: unknown) => void this.onMessage(m));
    view.webview.html = await this.html(view.webview, media);
  }

  private async onMessage(m: unknown): Promise<void> {
    if (!isIncoming(m)) return;
    switch (m.type) {
      case 'ready':
        return this.render();
      case 'next':
        return this.controller.next();
      case 'prev':
        return this.controller.prev();
      case 'toggleMode':
        return this.controller.toggleMode();
      case 'toggleTranslation':
        return this.controller.toggleTranslation();
    }
  }

  async render(): Promise<void> {
    const view = this.view;
    if (!view) return;
    try {
      await view.webview.postMessage({ type: 'render', payload: await this.controller.payload() });
    } catch (err) {
      await view.webview.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  private async html(webview: vscode.Webview, media: vscode.Uri): Promise<string> {
    const template = await readFile(vscode.Uri.joinPath(media, 'reader.html').fsPath, 'utf8');
    const values: Record<string, string> = {
      cspSource: webview.cspSource,
      nonce: randomBytes(16).toString('base64'),
      cssUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'reader.css')).toString(),
      jsUri: webview.asWebviewUri(vscode.Uri.joinPath(media, 'reader.js')).toString(),
    };
    return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => values[k] ?? '');
  }

  dispose(): void {
    this.subscription.dispose();
  }
}
