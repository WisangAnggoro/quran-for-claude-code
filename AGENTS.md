# AGENTS.md

Guide for AI coding agents (Claude Code, Copilot, Cursor, etc.) working in this repo.

## Project

**Quran for Claude Code (Unofficial)** — a VS Code extension that shows Quran ayat in a bottom-panel webview while Claude Code is working. Fully offline. See:
- `INTENT.md` — why, principles, non-goals. Read first; principles override convenience.
- `SPEC.md` — exact behaviour, commands, settings, data model.
- `PLAN.md` — phased checklist. Work phase by phase; tick boxes as you finish.

## Stack

- TypeScript (strict), bundled with esbuild to `dist/extension.js`.
- VS Code Extension API only. **No runtime npm dependencies** (devDependencies are fine).
- Webview: plain HTML/CSS/JS in `media/` — no frameworks, no CDN.
- Tests: mocha + `@vscode/test-electron`.

## Commands

```sh
npm install            # dev deps
npm run build:data     # data-src/ → data/*.json (with validation)
npm run build          # esbuild bundle
npm run watch          # rebuild on change
npm test               # unit + extension tests
npm run lint
npx @vscode/vsce package   # produce .vsix
```
Debug: press F5 in VS Code ("Run Extension").

## Layout

```
src/
  extension.ts           activate/deactivate, wiring
  reader.ts              mode state machine, bookmark
  quran/                 index math, ref parsing, data store
  view/                  WebviewViewProvider
  claude/                stateWatcher.ts, hooks.ts
media/                   reader.html/css/js, fonts/, icon.png
data/                    generated JSON (committed) + licenses
data-src/                raw Tanzil downloads (git-ignored)
scripts/build-data.mjs
test/
```

## Hard rules

1. **Never modify Quran text.** Do not hand-edit anything in `data/quran-*.json`, never normalise, trim, reformat, or "fix" Arabic text, and never generate or type ayat from memory. Text only comes from Tanzil source files via `scripts/build-data.mjs`.
2. **No network.** Never add `fetch`, `http(s)`, `net`, `XMLHttpRequest`, remote URLs in the webview, telemetry, or CDN assets. Keep the webview CSP strict (`default-src 'none'`).
3. **Never clobber user config.** Writes to `~/.claude/settings.json` must: require explicit user confirmation, back up first, merge (not replace), be idempotent, and abort on unparseable JSON.
4. **Never steal focus.** Revealing the panel always uses `preserveFocus: true`.
5. **Branding.** Always "Unofficial"; never imply Anthropic affiliation; no Anthropic logos or brand assets.
6. **Attribution stays.** Do not remove Tanzil/translator/font credits or license files.
7. **Translations are lookups.** No machine translation, no LLM calls.

## Conventions

- Ayah positions use the **global index 0…6235** internally; convert to `surah:ayah` only at the edges (UI, input parsing).
- Config keys are prefixed `quranForClaudeCode.`; command IDs likewise.
- Keep `activate()` cheap — lazy-load data on first panel render.
- Arabic elements: `lang="ar" dir="rtl"`. Use `--vscode-*` CSS variables for colours.
- Small, focused modules; pure logic (reader, index math, hook merge) must be unit-testable without VS Code.
- Update `PLAN.md` checkboxes and `CHANGELOG.md` with each meaningful change.

## Before finishing a task

- `npm run lint && npm test` pass.
- If data changed: `npm run build:data` validation passes.
- No new runtime dependencies; no network code (`grep -rnE "fetch|https?://|require\\(['\"]https?" src media` is clean apart from comments/attribution links).
