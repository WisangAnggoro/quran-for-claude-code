# Intent

## Why this exists

When Claude Code is working, the developer waits — sometimes seconds, often minutes. That idle time usually goes to scrolling social media or staring at a spinner. **Quran for Claude Code** turns those moments into a few ayat of tilawah, so waiting on an AI agent becomes time spent with the Quran.

## Who it is for

- Muslim developers who use Claude Code inside VS Code.
- People who want small, steady Quran reading habits (a few ayat per day adds up to khatam over time).
- Users who work offline, behind corporate proxies, or simply do not want an extension that phones home.

## Principles (in priority order)

1. **Respect the text.** The Quran text is shown exactly as published by the source (Tanzil). It is never edited, auto-corrected, truncated mid-word, or generated. Translations are always labelled as translations, with translator name.
2. **Totally offline.** No network request, ever — no telemetry, no CDN fonts, no remote APIs. Everything ships inside the `.vsix`.
3. **Calm, not intrusive.** The panel appears when Claude Code starts working and never steals keyboard focus. One click turns it off.
4. **Continuity.** In continuous mode the reader always resumes exactly where they left off, so reading progresses across days and sessions.
5. **Small and simple.** No runtime dependencies. Fast to activate. Easy to audit.
6. **Free.** Free to install, no ads, no paid tier. (Also required by the non-commercial terms of most translations.)
7. **Honest branding.** Unofficial community extension. Not affiliated with or endorsed by Anthropic.

## Non-goals

- Not a full mushaf app (no page view, tajwid colouring, or tafsir in v1).
- Not an AI translator — "translate selection" looks up bundled human translations; it never machine-translates.
- No audio in v1 (it would bloat the package; may come later as an optional download).
- No accounts, sync, or cloud bookmarks.
- Not tied to Claude Code internals — integration is only through Claude Code's public hooks.

## What success looks like

- A user installs it, clicks "Install hooks" once, and from then on ayat appear automatically whenever Claude Code is working.
- The bookmark is never lost; continuous mode can carry someone from Al-Fatihah to An-Nas.
- Zero network traffic observable from the extension.
- Published on the VS Code Marketplace and Open VSX with clear attribution to Tanzil and the translators.
