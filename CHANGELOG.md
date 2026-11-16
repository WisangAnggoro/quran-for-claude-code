# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Project scaffold: strict TypeScript, esbuild bundle, ESLint with rules that forbid network APIs, F5 launch config.
- `npm run build:data`: parses Tanzil sources into `data/`, pins each source by SHA-256, checks 6,236 ayat against surah metadata, and verifies every ayah round-trips byte-for-byte.
- About & Attribution command, and a Tanzil credit line in the panel.
- README, CONTRIBUTING and an original 128px icon.
- Translate selection: select Arabic text in the panel and press `S`, right-click → *Translate Selection*, or run the command, to see the bundled translation (with translator credit) in a popover.
- Native Windows support for the hooks: choose Git Bash or PowerShell when installing; the status file lives under `%USERPROFILE%`.
- Claude Code integration: `Install/Uninstall Claude Code Hooks` commands (confirm first, back up `settings.json`, merge without touching other hooks, idempotent, abort on invalid JSON). While Claude Code works, the panel opens without taking focus and moves to the next ayah; the status bar shows a spinner.
- Status bar item: `Quran: On/Off` toggle with mode and bookmark in the tooltip.
- Commands: Toggle On/Off, Next/Previous Ayah, Switch Mode, Go to Ayah… (accepts `2:255`, `al-baqarah 255`, `yasin`), Reset Bookmark (asks first).
- Settings: `enabled`, `autoReveal`, `advanceOnNewTurn`, `staleBusyMinutes`.
- Quran panel in the bottom panel area: Arabic text in Amiri Quran, basmalah header on ayah 1, labelled translation, Next/Prev/Mode/Translation buttons, ← / → / T keys, VS Code theme colours, strict CSP.
- Settings: `mode`, `translation` (default English for everyone), `showTranslation`, `arabicFontSize`.
- Translation chooser: `English ▾` button in the panel and **Quran: Choose Translation…**.
- Reader core: global index ↔ `surah:ayah` conversion, reference parsing (`2:255`, `al-baqarah 255`, `yasin`, Arabic names), lazy data store, and continuous/random reader with persisted bookmark and 50-entry random history.
- Bundled data: Tanzil Uthmani text v1.1, surah metadata, Indonesian (Kemenag) and English (Saheeh International) translations, each with its source notice.
- Bundled font: Amiri Quran 1.003 (SIL OFL 1.1).
- MIT `LICENSE` for code and `NOTICE.md` for third-party data, fonts and trademarks.
