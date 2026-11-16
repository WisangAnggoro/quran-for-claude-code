// Connects the hook state file to the UI: status bar spinner, auto-reveal (never focused),
// and advancing to the next ayah on each new prompt.

import { homedir } from 'node:os';
import * as vscode from 'vscode';
import { readExtensionSettings } from '../config';
import type { ReaderController } from '../controller';
import type { ReaderViewProvider } from '../view/ReaderViewProvider';
import type { StatusBar } from '../view/StatusBar';
import { stateFilePath } from './state';
import { StateWatcher, type StateChange } from './stateWatcher';

export const STATE_FILE = stateFilePath(process.platform, process.env, homedir());
const LAST_TURN_KEY = 'lastAdvancedTurn';

export class ClaudeIntegration implements vscode.Disposable {
  private readonly watcher: StateWatcher;

  constructor(
    private readonly globalState: vscode.Memento,
    private readonly controller: ReaderController,
    private readonly provider: ReaderViewProvider,
    private readonly statusBar: StatusBar,
  ) {
    this.watcher = new StateWatcher({
      file: STATE_FILE,
      staleMinutes: () => readExtensionSettings().staleBusyMinutes,
      onChange: (c) => void this.onChange(c),
    });
  }

  start(): Promise<void> {
    return this.watcher.start();
  }

  private async onChange({ state, newTurn }: StateChange): Promise<void> {
    this.statusBar.setBusy(state.activity === 'busy');
    const settings = readExtensionSettings();
    if (!newTurn || !settings.enabled) return;
    if (settings.advanceOnNewTurn && (await this.claimTurn(state.timestamp))) await this.controller.next();
    if (settings.autoReveal) await this.provider.reveal();
  }

  /**
   * Every VS Code window sees the same state file. Record the turn's timestamp in the
   * shared globalState so only the first window to see a turn advances the bookmark.
   * Best effort: two windows polling in the same instant could both advance.
   */
  private async claimTurn(timestamp: number | undefined): Promise<boolean> {
    if (timestamp === undefined) return true;
    if (this.globalState.get<number>(LAST_TURN_KEY) === timestamp) return false;
    await this.globalState.update(LAST_TURN_KEY, timestamp);
    return true;
  }

  dispose(): void {
    this.watcher.stop();
  }
}
