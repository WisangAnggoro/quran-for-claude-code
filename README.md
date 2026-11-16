# Quran for Claude Code (Unofficial)

> Unofficial community extension. Not affiliated with or endorsed by Anthropic.

Read a few ayat of the Quran while Claude Code works. When you send Claude Code a prompt, a **Quran** panel opens at the bottom of VS Code (without taking your keyboard focus) and shows the next ayah. Over days and weeks, those waits add up to a steady reading habit.

Everything is bundled. The extension never connects to the internet.

## Features

- **Reader panel** next to Terminal/Output: Uthmani Arabic text in the Amiri Quran font, with an optional translation underneath.
- **Continuous mode** (default): picks up exactly where you left off, across sessions and windows. Wraps from An-Nas back to Al-Fatihah.
- **Random mode**: a random ayah each time, with Prev to go back through the last 50. Never moves your continuous bookmark.
- **Shows up while Claude Code works**: opens without stealing focus and moves to the next ayah on each prompt. A spinner appears in the status bar while Claude is busy.
- **Translations**: English (Saheeh International, the default) and Bahasa Indonesia (Kementerian Agama RI). Switch with the translation button in the panel (`English ▾`) or **Quran: Choose Translation…**.
- **Translate selection**: select Arabic text in the panel and press `S` (or right-click → *Translate Selection*) to see the translation of that ayah. This looks up the bundled human translation; nothing is machine-translated.
- **Go to Ayah**: type `2:255`, `al-baqarah 255` or `yasin`.

## Getting started

1. Install the extension.
2. Run **Quran: Install Claude Code Hooks** from the Command Palette (or accept the offer that appears once).
3. Start a new Claude Code session. From now on, the panel appears whenever Claude Code is working.

Without the hooks, the extension still works as a manual reader: open the **Quran** tab in the bottom panel.

### What the hooks do

The install command shows exactly what it will add and asks before changing anything. It adds three entries to `~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json`):

| Claude Code event | Command writes |
|---|---|
| `UserPromptSubmit` | `busy <time>` to `~/.quran-for-claude-code/state` |
| `Stop`, `SessionEnd` | `idle <time>` to the same file |

Each command is a single shell line ending in `# quran-for-claude-code`. Before writing, the extension saves a backup (`settings.json.bak-<date>-<time>`), keeps all your other settings and hooks, and stops if the file is not valid JSON. Installing twice changes nothing. **Quran: Uninstall Claude Code Hooks** removes only these tagged entries.

On macOS, Linux and WSL the hooks run in `sh`. On native Windows, the install command asks whether Claude Code should run them in **Git Bash** (Claude Code's default when Git for Windows is installed) or **PowerShell** (works without Git Bash; needs a Claude Code version that supports the hook `shell` setting). Either way the status file is `%USERPROFILE%\.quran-for-claude-code\state`. Running the install command again with the other choice switches over cleanly.

## Keys (when the panel is focused)

| Key | Action |
|---|---|
| `←` | Next ayah (right-to-left reading direction) |
| `→` | Previous ayah |
| `T` | Show/hide translation |
| `S` | Translate the selected Arabic text |
| `Esc` | Close the translation popover |

## Commands

All commands start with **Quran:** in the Command Palette.

| Command | What it does |
|---|---|
| Toggle On/Off | Master switch (also: click the status bar item) |
| Next Ayah / Previous Ayah | Move in the current mode |
| Switch Mode (Random/Continuous) | |
| Go to Ayah… | Jump to `2:255`, `al-baqarah 255`, `yasin`, … |
| Translate Selection | Translation of the selected Arabic text |
| Choose Translation… | English, Bahasa Indonesia, or none |
| Reset Bookmark to Al-Fatihah | Asks first |
| Install / Uninstall Claude Code Hooks | See above |
| About & Attribution | Credits and licenses |

## Settings

| Setting | Default | Description |
|---|---|---|
| `quranForClaudeCode.enabled` | `true` | Master switch. When off, Claude Code activity is ignored. |
| `quranForClaudeCode.mode` | `continuous` | `continuous` or `random` |
| `quranForClaudeCode.translation` | `en.sahih` | `id.indonesian`, `en.sahih` or `none` |
| `quranForClaudeCode.showTranslation` | `true` | Show the translation by default |
| `quranForClaudeCode.autoReveal` | `true` | Open the panel when Claude Code starts working (never takes focus) |
| `quranForClaudeCode.advanceOnNewTurn` | `true` | Move to the next ayah on each prompt |
| `quranForClaudeCode.arabicFontSize` | `28` | Arabic text size in pixels (12–72) |
| `quranForClaudeCode.staleBusyMinutes` | `30` | Treat Claude Code as idle after this long without a Stop event |

## Privacy

- No network access of any kind: no telemetry, no CDN, no remote fonts or APIs. The webview runs under a strict Content Security Policy.
- The extension only writes to VS Code's own storage (your bookmark), `~/.quran-for-claude-code/state`, and, only after you confirm, `~/.claude/settings.json`.

## About the text

The Arabic text is the Tanzil Uthmani text, included byte-for-byte as published; the build checks every ayah against the source file. For ayah 1 of each surah except Al-Fatihah and At-Tawbah, the basmalah that Tanzil includes at the start of the text is displayed as a separate heading line. The stored text is not changed.

Translations are always labelled with the translator's name so they are never mistaken for the Quran itself.

## Known limitations

- If several Claude Code sessions run at once, they share one status file, so the spinner reflects whichever session reported last.
- If you interrupt Claude Code (Esc), it does not send a Stop event, so the spinner keeps going until your next turn finishes or `staleBusyMinutes` passes. Your next prompt still counts as a new turn and advances the ayah.

## Attribution and licenses

- **Quran text:** [Tanzil Project](https://tanzil.net), Tanzil Quran Text (Uthmani, version 1.1), CC BY 3.0. Verbatim copy; changing it is not allowed.
- **Translations** (via Tanzil, for non-commercial use): Bahasa Indonesia, Kementerian Agama RI; English, Saheeh International.
- **Font:** Amiri Quran 1.003, © The Amiri Project Authors, SIL Open Font License 1.1.

The MIT license in [`LICENSE`](LICENSE) covers the code only. The Quran text, translations and font keep their own licenses; see [`NOTICE.md`](NOTICE.md). Because the translations are licensed for non-commercial use, this extension is and will stay free.

"Claude" and "Claude Code" are trademarks of Anthropic, PBC. This project is unofficial and is not affiliated with, sponsored by or endorsed by Anthropic.
