// Owns the reader state and settings; the panel and (later) commands talk to this.
// Settings are the single source of truth for mode and translation visibility:
// toggles write the setting, and the configuration-change event re-renders.

import * as vscode from 'vscode';
import { readSettings, SECTION, syncContextKeys, updateSetting } from './config';
import type { QuranStore } from './quran/store';
import { Reader, type BookmarkStore } from './reader';
import {
  buildPayload,
  translateSelection,
  type ReaderSettings,
  type RenderPayload,
  type SelectionTranslation,
} from './session';

export class ReaderController implements vscode.Disposable {
  private settings: ReaderSettings = readSettings();
  private readerP?: Promise<Reader>;
  private readonly changed = new vscode.EventEmitter<void>();
  private readonly subscriptions: vscode.Disposable[];

  /** Fires when what the panel shows may have changed. */
  readonly onDidChange = this.changed.event;

  constructor(
    private readonly store: QuranStore,
    private readonly bookmarks: BookmarkStore,
  ) {
    syncContextKeys(this.settings);
    this.subscriptions = [
      this.changed,
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (!e.affectsConfiguration(SECTION)) return;
        this.settings = readSettings();
        syncContextKeys(this.settings);
        if (!this.readerP) return this.changed.fire();
        void this.readerP.then((r) => {
          r.setMode(this.settings.mode);
          this.changed.fire();
        });
      }),
    ];
  }

  /** Created on first use so activation never touches the data files. */
  private reader(): Promise<Reader> {
    this.readerP ??= this.store.index().then((i) => new Reader(i.total, this.bookmarks, this.settings.mode));
    return this.readerP;
  }

  async payload(): Promise<RenderPayload> {
    const r = await this.reader();
    return buildPayload(this.store, r.current(), this.settings);
  }

  async next(): Promise<void> {
    (await this.reader()).next();
    this.changed.fire();
  }

  async prev(): Promise<void> {
    (await this.reader()).prev();
    this.changed.fire();
  }

  async goTo(index: number): Promise<void> {
    (await this.reader()).goTo(index);
    this.changed.fire();
  }

  async resetBookmark(): Promise<void> {
    (await this.reader()).resetBookmark();
    this.changed.fire();
  }

  /** Mode and bookmark for the status bar. The bookmark ref is only known once data is loaded. */
  async describe(): Promise<{ mode: ReaderSettings['mode']; bookmarkRef?: string }> {
    if (!this.readerP) return { mode: this.settings.mode };
    const [r, index] = await Promise.all([this.readerP, this.store.index()]);
    return { mode: this.settings.mode, bookmarkRef: index.formatRef(r.bookmark) };
  }

  /** Bundled translation for ayat the user selected in the panel (lookup only). */
  translateSelection(indices: unknown): Promise<SelectionTranslation | undefined> {
    return translateSelection(this.store, indices, this.settings.translation);
  }

  async toggleMode(): Promise<void> {
    await updateSetting('mode', this.settings.mode === 'continuous' ? 'random' : 'continuous');
  }

  async toggleTranslation(): Promise<void> {
    await updateSetting('showTranslation', !this.settings.showTranslation);
  }

  dispose(): void {
    for (const d of this.subscriptions) d.dispose();
  }
}
