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
  - Translation below (toggleable, see F5).
- Buttons: **Prev**, **Next**, **Mode** toggle (Random / Continuous), **Show/Hide translation**.
- Keyboard (when panel focused): `←` next, `→` prev (RTL-natural), `T` toggle translation.
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

### F4. Claude Code integration (auto show)
- Claude Code reports activity through **hooks** that write a small state file:
  - Path: `~/.quran-for-claude-code/state` (contents: `busy <unix-ts>` or `idle <unix-ts>`).
  - `UserPromptSubmit` → write `busy`.
  - `Stop` and `SessionEnd` → write `idle`.
- The extension watches that file (`fs.watch` with polling fallback, 1 s).
- On `idle → busy` transition and extension enabled:
  - Reveal the panel with `preserveFocus: true` (never steal focus) if `autoReveal` is on.
  - If `advanceOnNewTurn` is on: continuous mode advances to the next ayah; random mode picks a new random ayah.
- On `busy → idle`: no change to the panel (the user may keep reading). Status bar spinner stops.
- Stale protection: a `busy` older than `staleBusyMinutes` (default 30) is treated as idle.
- If hooks are not installed, the extension still works as a manual reader; a one-time info message offers to install hooks.

### F5. Translations & "Translate selection"
- Bundled translations (v1):
  - `id.indonesian` — Bahasa Indonesia, Kementerian Agama RI (via Tanzil)
  - `en.sahih` — English, Saheeh International (via Tanzil)
- Setting `translation` chooses one (`id.indonesian` | `en.sahih` | `none`).
- **Show translation** setting decides whether the translation is visible by default.
- **Translate selection**: when the user selects any Arabic text inside the panel and either right-clicks → *Translate selection* or presses `Ctrl/Cmd+Shift+T` (panel focused), a popover shows the full translation of the ayah(s) containing the selection, labelled with translator name. This is a lookup, never machine translation.
- Command `Quran: Go to Ayah…` accepts `2:255` or `al-baqarah 255` input.

### F6. Hook installer
- Command `Quran: Install Claude Code Hooks`:
  1. Shows a modal explaining exactly what will be added to `~/.claude/settings.json`.
  2. On confirm, creates a backup `settings.json.bak-<timestamp>`, then **merges** hook entries (never overwrites existing hooks).
  3. Entries are tagged so they can be identified (command string contains `quran-for-claude-code`). Installing twice is a no-op.
- Command `Quran: Uninstall Claude Code Hooks` removes only our tagged entries.
- Hook commands (POSIX shell, used by Claude Code on macOS/Linux/WSL and Git Bash on Windows). Each writes to a temp file then renames, so the watcher never reads a half-written file. The trailing `# quran-for-claude-code` comment is the tag used for idempotency and uninstall.
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
| `quranForClaudeCode.translation` | `id.indonesian` \| `en.sahih` \| `none` | `en.sahih` (auto `id.indonesian` if VS Code locale is `id`) | |
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
  - `quran-uthmani.json` — `string[6236]`, verbatim Tanzil Uthmani text.
  - `meta.json` — 114 surahs: `{ number, nameArabic, nameLatin, nameTranslation, ayahCount, startIndex, revelation }`.
  - `trans/id.indonesian.json`, `trans/en.sahih.json` — `string[6236]`.
- Data is loaded lazily on first panel open; translation files are loaded only when selected.
- Expected package size: < 5 MB.

## 7. Offline & security

- Webview CSP: `default-src 'none'; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-…'; img-src ${webview.cspSource}`.
- No `fetch`, `http`, `https`, or `net` usage anywhere in the extension.
- Webview `localResourceRoots` restricted to `media/` and `data/`.
- The extension only writes to: `globalState`, `~/.quran-for-claude-code/`, and (with explicit consent) `~/.claude/settings.json`.

## 8. Platforms

- Windows, macOS, Linux, WSL / Remote. In Remote-WSL/SSH, the extension runs on the **UI side** (`"extensionKind": ["ui", "workspace"]`) — open question: hooks run where Claude Code runs, so the state file must be read on that side. See PLAN.md open questions.

## 9. Attribution & licensing

- Quran text: Tanzil Project (tanzil.net) — verbatim copy, unchanged, with link back. Required notice included in `data/LICENSE-TANZIL.txt` and the About view.
- Translations: each translator credited in UI and README; Tanzil translations are for non-commercial use — the extension is and stays free.
- Font: KFGQPC Uthmanic Script HAFS (King Fahd Complex) or Amiri Quran (SIL OFL) — license file bundled.
- README footer: "Claude" and "Claude Code" are trademarks of Anthropic, PBC. This project is unofficial and not affiliated with Anthropic.
- Icon: original artwork; no Anthropic logo, starburst, or brand orange.

## 10. Out of scope (v1)

Audio recitation, tafsir, word-by-word, tajwid colouring, mushaf page view, search, multiple simultaneous translations, sync.
