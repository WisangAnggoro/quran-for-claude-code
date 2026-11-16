// Command Palette commands (SPEC §3).

import * as vscode from 'vscode';
import { showAbout } from './about';
import { installHooksCommand, uninstallHooksCommand } from './claude/hookCommands';
import { readExtensionSettings, readSettings, setEnabled, updateSetting } from './config';
import { TRANSLATION_CREDITS, TRANSLATION_IDS, type QuranStore } from './quran/store';
import type { TranslationSetting } from './session';
import type { ReaderController } from './controller';
import type { ReaderViewProvider } from './view/ReaderViewProvider';

export function registerCommands(
  extensionUri: vscode.Uri,
  controller: ReaderController,
  provider: ReaderViewProvider,
  store: QuranStore,
): vscode.Disposable[] {
  /** Bring the panel into view without taking focus. */
  async function show(): Promise<void> {
    await provider.reveal();
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
    reg('translateSelection', () => provider.requestTranslateSelection()),
    reg('chooseTranslation', async () => {
      const current = readSettings().translation;
      type Item = vscode.QuickPickItem & { value: TranslationSetting };
      const items: Item[] = [
        ...TRANSLATION_IDS.map((id) => ({
          value: id,
          label: TRANSLATION_CREDITS[id].language,
          description: TRANSLATION_CREDITS[id].translator,
        })),
        { value: 'none', label: 'No translation' },
      ];
      for (const i of items) if (i.value === current) i.detail = 'Current';
      const pick = await vscode.window.showQuickPick(items, { title: 'Quran: Choose Translation' });
      if (pick && pick.value !== current) await updateSetting('translation', pick.value);
    }),
    reg('about', () => showAbout(extensionUri)),
    reg('installHooks', installHooksCommand),
    reg('uninstallHooks', uninstallHooksCommand),
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
