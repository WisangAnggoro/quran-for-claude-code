// Command Palette commands (SPEC §3). Hooks, translate-selection and About arrive in later phases.

import * as vscode from 'vscode';
import { readExtensionSettings, setEnabled } from './config';
import type { ReaderController } from './controller';
import type { QuranStore } from './quran/store';
import { ReaderViewProvider } from './view/ReaderViewProvider';

export function registerCommands(
  controller: ReaderController,
  provider: ReaderViewProvider,
  store: QuranStore,
): vscode.Disposable[] {
  /**
   * Bring the panel into view for a command the user just ran. If VS Code has not created
   * the view yet, the only API that creates it is the view's focus command, so the first
   * explicit command of a session focuses the panel. Automatic reveals never do this.
   */
  async function show(): Promise<void> {
    if (!provider.reveal()) await vscode.commands.executeCommand(`${ReaderViewProvider.viewId}.focus`);
  }

  const reg = (id: string, fn: () => unknown) => vscode.commands.registerCommand(`quranForClaudeCode.${id}`, fn);

  return [
    reg('toggle', () => setEnabled(!readExtensionSettings().enabled)),
    reg('next', async () => {
      await controller.next();
      await show();
    }),
    reg('prev', async () => {
      await controller.prev();
      await show();
    }),
    reg('toggleMode', () => controller.toggleMode()),
    reg('goTo', async () => {
      const index = await store.index();
      const input = await vscode.window.showInputBox({
        title: 'Quran: Go to Ayah',
        prompt: 'Surah and ayah, e.g. 2:255, al-baqarah 255, yasin',
        placeHolder: '2:255',
        validateInput: (v) => {
          if (v.trim() === '') return null;
          const r = index.parseRef(v);
          return r.ok ? null : r.error;
        },
      });
      if (input === undefined || input.trim() === '') return;
      const r = index.parseRef(input);
      if (!r.ok) return;
      await controller.goTo(r.index);
      await show();
    }),
    reg('resetBookmark', async () => {
      const { bookmarkRef } = await controller.describe();
      const current = bookmarkRef ? ` Your bookmark is at ${bookmarkRef}.` : '';
      const ok = await vscode.window.showWarningMessage(
        `Reset your reading bookmark to Al-Fatihah 1:1?${current}`,
        { modal: true },
        'Reset',
      );
      if (ok !== 'Reset') return;
      await controller.resetBookmark();
    }),
  ];
}
