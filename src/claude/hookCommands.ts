// "Install/Uninstall Claude Code Hooks" commands and the one-time offer to install.
// Every write to settings.json is preceded by an explicit modal confirmation (AGENTS.md rule 3).

import { existsSync } from 'node:fs';
import * as vscode from 'vscode';
import {
  HOOK_EVENTS,
  HookConfigError,
  hooksInstalled,
  installHooks,
  uninstallHooks,
  type HookVariant,
} from './hooks';
import { applyToSettingsFile, claudeSettingsPath, readSettingsFile } from './settingsFile';
import { findGitBash } from './windows';

const PROMPT_DISMISSED_KEY = 'hooksPromptDismissed';

const SHELL_NAMES: Record<HookVariant, string> = {
  posix: 'sh',
  gitbash: 'Git Bash',
  powershell: 'PowerShell',
};

function describeHooks(variant: HookVariant): string {
  const events = (a: string) => Object.keys(HOOK_EVENTS).filter((e) => HOOK_EVENTS[e] === a).join(', ');
  const file = variant === 'posix' ? '~/.quran-for-claude-code/state' : '%USERPROFILE%\\.quran-for-claude-code\\state';
  return (
    `• ${events('busy')} → writes "busy <time>" to ${file}\n` +
    `• ${events('idle')} → writes "idle <time>" to the same file\n\n` +
    `Each command is one line run by ${SHELL_NAMES[variant]}. ` +
    'Nothing else is run and nothing leaves your machine. Your existing settings and hooks are kept, ' +
    'and a backup of settings.json is saved next to it before any change.'
  );
}

/**
 * Pick the hook variant. Only native Windows has a choice: Git Bash (Claude Code's default
 * when Git for Windows is installed) or PowerShell (always available; set explicitly per hook).
 */
async function chooseVariant(): Promise<HookVariant | undefined> {
  if (process.platform !== 'win32') return 'posix';
  const gitBash = findGitBash(process.env, existsSync);
  type Item = vscode.QuickPickItem & { variant: HookVariant };
  const bash: Item = {
    variant: 'gitbash',
    label: 'Git Bash',
    description: gitBash ? `found: ${gitBash}` : 'not found',
    detail: "Claude Code's default shell on Windows when Git for Windows is installed.",
  };
  const ps: Item = {
    variant: 'powershell',
    label: 'PowerShell',
    description: gitBash ? undefined : 'recommended: Git Bash was not found',
    detail: 'Works without Git Bash. Needs a Claude Code version that supports the hook "shell" setting.',
  };
  const pick = await vscode.window.showQuickPick(gitBash ? [bash, ps] : [ps, bash], {
    title: 'Quran: Which shell should Claude Code use for the hooks?',
  });
  return pick?.variant;
}

async function report(err: unknown): Promise<void> {
  const msg = err instanceof HookConfigError ? err.message : `Could not update Claude Code settings: ${String(err)}`;
  await vscode.window.showErrorMessage(msg);
}

export async function installHooksCommand(): Promise<void> {
  const variant = await chooseVariant();
  if (!variant) return;
  const path = claudeSettingsPath();
  const ok = await vscode.window.showInformationMessage(
    'Install Quran for Claude Code hooks?',
    { modal: true, detail: `This adds 3 hooks to ${path}:\n\n${describeHooks(variant)}` },
    'Install',
  );
  if (ok !== 'Install') return;
  try {
    const r = await applyToSettingsFile(path, (s) => installHooks(s, variant));
    if (!r.changed) {
      void vscode.window.showInformationMessage(`Quran hooks (${SHELL_NAMES[variant]}) are already installed.`);
      return;
    }
    const backup = r.backup ? ` Backup: ${r.backup}` : '';
    void vscode.window.showInformationMessage(
      `Quran hooks installed. Start a new Claude Code session for them to take effect.${backup}`,
    );
  } catch (err) {
    await report(err);
  }
}

export async function uninstallHooksCommand(): Promise<void> {
  const path = claudeSettingsPath();
  const ok = await vscode.window.showWarningMessage(
    'Remove Quran for Claude Code hooks?',
    { modal: true, detail: `Only entries tagged "quran-for-claude-code" are removed from ${path}. A backup is saved first.` },
    'Remove',
  );
  if (ok !== 'Remove') return;
  try {
    const r = await applyToSettingsFile(path, uninstallHooks);
    void vscode.window.showInformationMessage(
      r.changed ? `Quran hooks removed.${r.backup ? ` Backup: ${r.backup}` : ''}` : 'No Quran hooks were installed.',
    );
  } catch (err) {
    await report(err);
  }
}

/** Offer (once, non-modal, no focus change) to install hooks if they are missing. */
export async function maybeOfferHooks(globalState: vscode.Memento): Promise<void> {
  if (globalState.get<boolean>(PROMPT_DISMISSED_KEY)) return;
  try {
    const file = await readSettingsFile(claudeSettingsPath());
    if (hooksInstalled(file.data)) return;
  } catch {
    return; // unreadable or unexpected settings: don't nag; the command reports details
  }
  const choice = await vscode.window.showInformationMessage(
    'Quran for Claude Code can show an ayah automatically whenever Claude Code is working. Install the Claude Code hooks?',
    'Install…',
    "Don't ask again",
  );
  if (choice === 'Install…') await installHooksCommand();
  else if (choice === "Don't ask again") await globalState.update(PROMPT_DISMISSED_KEY, true);
}
