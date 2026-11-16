# Specification — Quran for Claude Code (Unofficial)

Version: 0.1 (v1 scope) · Status: draft

## 1. Identity

| Field | Value |
|---|---|
| Display name | Quran for Claude Code (Unofficial) |
| Extension ID | `quran-for-claude-code` |
| Publisher | _TBD (Marketplace publisher ID)_ |
| Description | Unofficial community extension. Not affiliated with or endorsed by Anthropic. Read the Quran while Claude Code works — totally offline. |
| Categories | Other, Education |
| Min VS Code | `^1.90.0` |
| License | MIT for code; data under its own source licenses (see §9) |

## 2. Features

### F1. Reader panel
- A `WebviewView` named **Quran** contributed to the bottom **panel** area (own view container, so it sits next to Terminal/Output).
- Shows one ayah at a time:
  - Surah name (Arabic + transliteration), surah number, ayah number — e.g. `Al-Baqarah · 2:255`.
  - Arabic text, right-to-left, bundled Uthmani font, large size (configurable).
  - For ayah 1 of every surah except 1 and 9, the basmalah that Tanzil prefixes to the text is shown as a separate centred header line. This is display-only: both lines are exact substrings of the stored ayah and re-join to it byte-for-byte.
  - Translation below (toggleable, see F5), always followed by its label, e.g. `English — Saheeh International (translation)`.
- Buttons: **Prev**, **Next**, **Mode** toggle (Random / Continuous), **Show/Hide translation**.
- Keyboard (handled inside the webview, so only active when the panel is focused; no global keybindings): `←` next, `→` prev (RTL-natural), `T` toggle translation, `S` translate selection.
- Follows VS Code theme colours via CSS variables (`--vscode-*`).

### F2. On/Off toggle (status bar)
- Status bar item, right side: `$(book) Quran: On` / `$(book) Quran: Off`.
- Click toggles `quranForClaudeCode.enabled`.
- When Off: panel is not auto-revealed and the hook state is ignored. Panel can still be opened manually.
- Tooltip shows current mode and bookmark, e.g. `Continuous · bookmark 2:255`.
- While Claude Code is busy, the icon changes to `$(book) $(loading~spin)`.

### F3. Modes
- **Continuous** (default): shows the bookmark ayah. **Next** advances one ayah and moves the bookmark. **Prev** goes back one ayah (also moves the bookmark). Wraps from 114:6 to 1:1.
- **Random**: shows a uniformly random ayah. **Next** picks a new random ayah. **Prev** walks back through a session history of up to 50 random ayat. Random mode never changes the continuous bookmark.
- Switching modes keeps both states independent.
- In random mode, **Next** after going back with **Prev** walks forward through the history before picking new ayat (browser-like). A new random ayah is never the one currently shown.
- **Go to Ayah…** follows the current mode: in continuous mode it moves the bookmark; in random mode it adds the ayah to the random history (dropping any forward entries) and leaves the bookmark alone.

### F4. Claude Code integration (auto show)
- Claude Code reports activity through **hooks** that write a small state file:
  - Path: `~/.quran-for-claude-code/state` (contents: `busy <unix-ts>` or `idle <unix-ts>`).
  - `UserPromptSubmit` → write `busy`.
  - `Stop` and `SessionEnd` → write `idle`.
- The extension polls that file every 1 s (`stat` only; the file is read when its mtime/size change). Polling is used instead of `fs.watch` because the hooks replace the file by rename, which `fs.watch` reports inconsistently across platforms and WSL, and a timer is needed for stale detection anyway.
- A **new turn** is `idle → busy`, or `busy` with a newer timestamp (Claude Code does not run `Stop` when the user interrupts a turn, so `busy` can follow `busy`). A `busy` already present when VS Code starts is not a new turn.
- On a new turn and extension enabled:
  - Reveal the panel with `preserveFocus: true` (never steal focus) if `autoReveal` is on.
  - If `advanceOnNewTurn` is on: continuous mode advances to the next ayah; random mode picks a new random ayah.
- On `busy → idle`: no change to the panel (the user may keep reading). Status bar spinner stops.
- Stale protection: a `busy` older than `staleBusyMinutes` (default 30) is treated as idle.
- Multiple VS Code windows: all see the same state file. The bookmark lives in shared `globalState` and is re-read before every move, so a window cannot rewind progress made in another. Each turn's timestamp is recorded in `globalState` so only one window advances for it (best effort).
- Panel reveal never takes focus: `WebviewView.show(true)` when the view exists, otherwise the workbench's `<viewId>.open` command with `{ preserveFocus: true }`. Never `.focus`.
- If hooks are not installed, the extension still works as a manual reader; a one-time info message offers to install hooks.

### F5. Translations & "Translate selection"
- Bundled translations (v1):
  - `id.indonesian` — Bahasa Indonesia, Kementerian Agama RI (via Tanzil)
  - `en.sahih` — English, Saheeh International (via Tanzil)
- Setting `translation` chooses one (`id.indonesian` | `en.sahih` | `none`); default `en.sahih` for everyone. The panel has a button showing the current translation (e.g. `English ▾`) that opens a quick pick, also available as **Quran: Choose Translation…**.
- **Show translation** setting decides whether the translation is visible by default.
- **Translate selection**: when the user selects any Arabic text inside the panel and either right-clicks → *Translate selection* or presses `S` (panel focused; `Ctrl/Cmd+Shift+T` is avoided because it is VS Code's *Reopen Closed Editor*), a popover shows the full translation of the ayah(s) containing the selection, labelled with translator name. This is a lookup, never machine translation. Selecting the basmalah header shows the translation of 1:1 (Tanzil's translation of ayah 1 of other surahs does not include it). If `translation` is `none`, English (Saheeh International) is used for the popover. At most 3 ayat are shown.
- Command `Quran: Go to Ayah…` accepts `2:255` or `al-baqarah 255` input.

### F6. Hook installer
- Command `Quran: Install Claude Code Hooks`:
  1. Shows a modal explaining exactly what will be added to `~/.claude/settings.json`.
  2. On confirm, creates a backup `settings.json.bak-<timestamp>`, then **merges** hook entries (never overwrites existing hooks).
  3. Entries are tagged so they can be identified (command string contains `quran-for-claude-code`). Installing twice is a no-op.
- Command `Quran: Uninstall Claude Code Hooks` removes only our tagged entries.
- Hook variants. Claude Code runs a hook's `command` with `sh -c` on macOS/Linux, Git Bash on Windows, or PowerShell on Windows when Git Bash is missing; a hook's `"shell": "powershell"` forces PowerShell.
  - **posix** (extension running on macOS/Linux/WSL): commands below; state under `$HOME`.
  - **gitbash** (native Windows): same as posix but `d="$(cygpath -u "$USERPROFILE")/.quran-for-claude-code"`.
  - **powershell** (native Windows): `$d = Join-Path $env:USERPROFILE '.quran-for-claude-code'`, `[IO.File]::WriteAllText` to `state.tmp`, then `Move-Item -Force` to `state`; the entry has `"shell": "powershell"`.
  - On native Windows the install command asks which one to use, recommending Git Bash when `bash.exe` is found (`CLAUDE_CODE_GIT_BASH_PATH` or the usual Git for Windows locations) and PowerShell otherwise. The extension reads the state file from `%USERPROFILE%` on Windows, because `$HOME` in Git Bash can differ. Installing one variant replaces any other variant of ours.
  - All three variants were run in real shells (sh, Git Bash, Windows PowerShell 5.1) and produce the same file.
- posix hook commands. Each writes to a temp file then renames, so the watcher never reads a half-written file. The trailing `# quran-for-claude-code` comment is the tag used for idempotency and uninstall.
  - `UserPromptSubmit` (busy):
    ```sh
    d="$HOME/.quran-for-claude-code"; mkdir -p "$d" && printf 'busy %s' "$(date +%s)" > "$d/state.tmp" && mv -f "$d/state.tmp" "$d/state" # quran-for-claude-code
    ```
  - `Stop` and `SessionEnd` (idle):
    ```sh
    d="$HOME/.quran-for-claude-code"; mkdir -p "$d" && printf 'idle %s' "$(date +%s)" > "$d/state.tmp" && mv -f "$d/state.tmp" "$d/state" # quran-for-claude-code
    ```
- Shape merged into `~/.claude/settings.json` (appended to any existing arrays, never replacing them):
  ```json
  {
    "hooks": {
      "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "<busy command>" }] }],
      "Stop":             [{ "hooks": [{ "type": "command", "command": "<idle command>" }] }],
      "SessionEnd":       [{ "hooks": [{ "type": "command", "command": "<idle command>" }] }]
    }
  }
  ```

## 3. Commands

| Command ID | Title |
|---|---|
| `quranForClaudeCode.toggle` | Quran: Toggle On/Off |
| `quranForClaudeCode.next` | Quran: Next Ayah |
| `quranForClaudeCode.prev` | Quran: Previous Ayah |
| `quranForClaudeCode.toggleMode` | Quran: Switch Mode (Random/Continuous) |
| `quranForClaudeCode.goTo` | Quran: Go to Ayah… |
| `quranForClaudeCode.translateSelection` | Quran: Translate Selection |
| `quranForClaudeCode.installHooks` | Quran: Install Claude Code Hooks |
| `quranForClaudeCode.uninstallHooks` | Quran: Uninstall Claude Code Hooks |
| `quranForClaudeCode.resetBookmark` | Quran: Reset Bookmark to Al-Fatihah |
| `quranForClaudeCode.about` | Quran: About & Attribution |

## 4. Settings

| Key | Type | Default | Notes |
|---|---|---|---|
| `quranForClaudeCode.enabled` | boolean | `true` | Master on/off |
| `quranForClaudeCode.mode` | `continuous` \| `random` | `continuous` | |
| `quranForClaudeCode.translation` | `id.indonesian` \| `en.sahih` \| `none` | `en.sahih` | Same default for everyone. Switch from the panel's translation button or **Quran: Choose Translation…**. |
| `quranForClaudeCode.showTranslation` | boolean | `true` | |
| `quranForClaudeCode.autoReveal` | boolean | `true` | Reveal panel when Claude starts |
| `quranForClaudeCode.advanceOnNewTurn` | boolean | `true` | |
| `quranForClaudeCode.arabicFontSize` | number | `28` | px |
| `quranForClaudeCode.staleBusyMinutes` | number | `30` | |

## 5. State (persisted)

Stored in `context.globalState` (survives restarts, shared across windows):
- `bookmark: number` — global ayah index 0…6235 (continuous mode).
- `randomHistory: number[]` — session-only, not persisted.
- `hooksPromptDismissed: boolean`.

## 6. Data model

- Global ayah index `0 … 6235` (6,236 ayat). Conversion to/from `surah:ayah` through a bundled table of ayah counts per surah.
- Files under `data/` (generated at build time, committed):
  - `quran-uthmani.json` — `{ notice: string[], ayat: string[6236] }`. `ayat` is the verbatim Tanzil Uthmani text; `notice` is Tanzil's copyright block copied verbatim, because Tanzil's terms require it in every derived file.
  - `meta.json` — 114 surahs: `{ number, nameArabic, nameLatin, nameTranslation, ayahCount, startIndex, revelation }`.
  - `trans/id.indonesian.json`, `trans/en.sahih.json` — same shape `{ notice, ayat }`, with the translation's credit block as `notice`.
  - `LICENSE-TANZIL.txt`, `trans/<id>.LICENSE.txt` — the same notice blocks as plain text.
- Provenance: `scripts/sources.json` (committed) lists every raw source file with its download URL, Tanzil version/date and SHA-256. Raw files live in `data-src/` (git-ignored, downloaded manually). `npm run build:data` refuses to run if any file in `data-src/` does not match its recorded hash, so anyone can reproduce `data/` byte-for-byte and verify the text is unmodified.
- Data is loaded lazily on first panel open; translation files are loaded only when selected.
- Expected package size: < 5 MB.

## 7. Offline & security

- Webview CSP: `default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-…'; img-src ${webview.cspSource}`.
- No `fetch`, `http`, `https`, or `net` usage anywhere in the extension.
- Webview `localResourceRoots` restricted to `media/` and `data/`.
- The extension only writes to: `globalState`, `~/.quran-for-claude-code/`, and (with explicit consent) `~/.claude/settings.json`.

## 8. Platforms

- Windows, macOS, Linux, WSL / Remote.
- `"extensionKind": ["workspace", "ui"]` — prefer the **workspace side**. Claude Code (and therefore its hooks) runs where the workspace lives, so in Remote-WSL/SSH/Containers the state file `~/.quran-for-claude-code/state` and `~/.claude/settings.json` are on the remote machine; the extension must run there to see them. Webviews still render on the UI side, which is fine because all data is shipped to the webview via `asWebviewUri`/messages.

## 9. Attribution & licensing

- **MIT covers the code only** (`src/`, `media/` except fonts, `scripts/`, `test/`). Everything under `data/` and `media/fonts/` keeps its own license. `NOTICE.md` at the repo root lists each third-party component and its terms; README must say the same, so forks are not misled into treating the whole repo as MIT.

- Quran text: Tanzil Project (tanzil.net) — verbatim copy, unchanged, with link back. Required notice included in `data/LICENSE-TANZIL.txt` and the About view.
- Translations: each translator credited in UI and README; Tanzil translations are for non-commercial use — the extension is and stays free.
- Font: Amiri Quran 1.003 (SIL OFL 1.1), bundled at `media/fonts/AmiriQuran.ttf` with `OFL.txt`. Chosen over KFGQPC HAFS because its redistribution terms are clear; verified to cover every code point in the Tanzil Uthmani text.
- README footer: "Claude" and "Claude Code" are trademarks of Anthropic, PBC. This project is unofficial and not affiliated with Anthropic.
- Icon: original artwork; no Anthropic logo, starburst, or brand orange.

## 10. Out of scope (v1)

Audio recitation, tafsir, word-by-word, tajwid colouring, mushaf page view, search, multiple simultaneous translations, sync.
