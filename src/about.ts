// "Quran: About & Attribution". Credits must stay (AGENTS.md rule 6).
// Links are opened in the user's browser only when they click; the extension itself
// never makes network requests.

import * as vscode from 'vscode';
import { TRANSLATION_CREDITS, TRANSLATION_IDS } from './quran/store';

export const TANZIL_URL = 'https://tanzil.net';

export function attributionText(): string {
  const translations = TRANSLATION_IDS.map((id) => {
    const c = TRANSLATION_CREDITS[id];
    return `• ${c.language} — ${c.translator}`;
  }).join('\n');
  return [
    'Unofficial community extension. Not affiliated with or endorsed by Anthropic.',
    '',
    'Quran text: Tanzil Quran Text (Uthmani, version 1.1), © Tanzil Project, CC BY 3.0, ' +
      `${TANZIL_URL}. Shown verbatim and unmodified.`,
    '',
    'Translations (via Tanzil, non-commercial use):',
    translations,
    '',
    'Arabic font: Amiri Quran 1.003, © The Amiri Project Authors, SIL Open Font License 1.1.',
    '',
    '"Claude" and "Claude Code" are trademarks of Anthropic, PBC.',
    '',
    'Free, fully offline, no telemetry.',
  ].join('\n');
}

export async function showAbout(extensionUri: vscode.Uri): Promise<void> {
  const notices = 'Open License Notices';
  const tanzil = 'Visit tanzil.net';
  const choice = await vscode.window.showInformationMessage(
    'Quran for Claude Code (Unofficial)',
    { modal: true, detail: attributionText() },
    notices,
    tanzil,
  );
  if (choice === notices) {
    await vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.joinPath(extensionUri, 'NOTICE.md'));
  } else if (choice === tanzil) {
    await vscode.env.openExternal(vscode.Uri.parse(TANZIL_URL));
  }
}
