# Implementation Plan

Each phase ends in a working, testable state. Check items off as they land.

## Phase 0 — Scaffold
- [x] `git init`, `.gitignore`, `.vscodeignore`, MIT `LICENSE`.
- [x] `package.json` with identity from SPEC §1, `engines.vscode`, `main: dist/extension.js`, empty `contributes`.
- [x] TypeScript (`strict`), esbuild bundle script, ESLint.
- [x] `src/extension.ts` with `activate`/`deactivate`; activation on `onStartupFinished` + view/command events.
- [x] `.vscode/launch.json` for F5 Extension Development Host.
- **Done when:** F5 launches and the extension activates with no errors. _(build, typecheck and lint verified; F5 check pending manual run)_

## Phase 1 — Data pipeline
- [x] Download (manually, once) into `data-src/` (git-ignored): Tanzil `quran-uthmani.txt` (with ayah numbers), `quran-data.xml` (surah metadata), translations `id.indonesian.txt`, `en.sahih.txt`.
- [x] `scripts/sources.json`: URL, Tanzil version/date and SHA-256 for each raw file; `build-data.mjs` verifies hashes before parsing.
- [x] `scripts/build-data.mjs`: parse → emit `data/quran-uthmani.json`, `data/meta.json`, `data/trans/*.json`.
- [x] Validation in the script: exactly 6,236 ayat; ayah counts per surah match metadata; text is byte-identical to source lines (no trimming beyond line endings).
- [x] Copy Tanzil license text to `data/LICENSE-TANZIL.txt` (automated by `build-data.mjs`; notice also embedded in each JSON).
- [ ] Add font + its license to `media/fonts/` (blocked on open question 4).
- **Done when:** `npm run build:data` produces the files and validation passes.

## Phase 2 — Reader core (no UI)
- [ ] `src/quran/index.ts`: `toRef(index) → {surah, ayah}`, `fromRef(surah, ayah) → index`, `parseRef("2:255" | "al-baqarah 255")`.
- [ ] `src/quran/store.ts`: lazy loads text/meta/translation JSON.
- [ ] `src/reader.ts`: state machine for continuous + random modes, bookmark in `globalState`, random history (cap 50), wrap-around.
- [ ] Unit tests (mocha) for index math, parsing, wrap, random history.
- **Done when:** tests pass.

## Phase 3 — Webview panel
- [ ] Contribute `viewsContainers.panel` + `views` (`quranForClaudeCode.reader`, type `webview`).
- [ ] `src/view/ReaderViewProvider.ts` with strict CSP + nonce, `localResourceRoots`.
- [ ] `media/reader.html|css|js`: header (surah · ref), Arabic (RTL, bundled font), translation, Prev / Next / Mode / Translation buttons, keyboard shortcuts.
- [ ] Message protocol: webview → ext `{type: 'next'|'prev'|'toggleMode'|'toggleTranslation'|'translateSelection', text?}`; ext → webview `{type: 'render', ayah}`.
- [ ] Theme via `--vscode-*` variables; test light, dark, high contrast.
- **Done when:** user can open the panel and read with Prev/Next in both modes; bookmark survives reload.

## Phase 4 — Status bar, commands, settings
- [ ] Status bar item with on/off, tooltip, busy spinner.
- [ ] All commands from SPEC §3 and settings from SPEC §4 in `package.json`.
- [ ] React to `onDidChangeConfiguration`.
- [ ] `Go to Ayah…` quick input.
- **Done when:** every command works from the Command Palette.

## Phase 5 — Claude Code integration
- [ ] `src/claude/stateWatcher.ts`: watch `~/.quran-for-claude-code/state`, parse, stale check, emit `busy`/`idle` events (debounced).
- [ ] Wire: on `idle→busy` → reveal (preserveFocus) + advance per settings.
- [ ] `src/claude/hooks.ts`: read/merge/backup `~/.claude/settings.json`; idempotent install; uninstall only tagged entries. Tolerate missing file / invalid JSON (abort with message, never clobber).
- [ ] Unit tests for merge/uninstall on fixtures (empty, existing hooks, already installed, malformed).
- [ ] First-run info message offering hook install (dismissable forever).
- [ ] Manual test with real Claude Code: prompt → panel shows ayah; Stop → spinner stops.
- **Done when:** end-to-end works in VS Code on Linux/WSL and macOS.

## Phase 6 — Translate selection
- [ ] In webview: detect selection inside ayah element; context menu via `webview/context` contribution + `data-vscode-context`; `S` key handled inside the webview (no global keybinding).
- [ ] Map selection → ayah index(es) (`data-index` attributes) → show translation popover with translator label.
- **Done when:** selecting Arabic text and invoking the command shows the right translation.

## Phase 7 — Polish & QA
- [ ] About view / command with attribution (Tanzil, translators, font, trademark notice).
- [ ] Verify no network: grep bundle for `http`, `fetch`; run with network disabled.
- [ ] Performance: activation < 50 ms; data load < 200 ms.
- [ ] Accessibility: buttons have labels; `lang="ar"` + `dir="rtl"` on Arabic; screen reader check.
- [ ] Spot-check 20+ ayat against tanzil.net for text accuracy.
- [ ] README with GIF, settings table, privacy statement, attribution, trademark disclaimer. CHANGELOG.
- [ ] 128×128 PNG icon (original artwork).

## Phase 8 — Publish
- [ ] Create Azure DevOps org + PAT (Marketplace → Manage), create publisher, set `publisher` in `package.json`.
- [ ] `vsce package` → install `.vsix` locally → smoke test.
- [ ] `vsce publish` (VS Code Marketplace) and `ovsx publish` (Open VSX).
- [ ] Tag `v0.1.0`, GitHub release with `.vsix`.

## Open questions
1. ~~**Remote / WSL:** decide `extensionKind` order.~~ Decided: `["workspace", "ui"]` (SPEC §8). Still needs a manual test in Remote-WSL and Remote-SSH during Phase 5.
2. **Windows native:** confirm the hook command works under Claude Code on Windows (Git Bash); otherwise ship a PowerShell variant.
3. **Multiple concurrent Claude sessions:** v1 uses a single state file (last writer wins). Consider per-session files keyed by `session_id` from hook stdin later.
4. **Font choice:** KFGQPC HAFS (most authentic for Uthmani text) vs Amiri Quran (OFL, clearer license). Confirm KFGQPC redistribution terms.
5. **Default translation:** confirm Indonesian (Kemenag) + English (Saheeh International) as the v1 pair.
6. **Basmalah in ayah 1:** Tanzil's Uthmani text prefixes the basmalah to ayah 1 of every surah except 1 and 9 (e.g. 2:1 starts with it). The text must stay verbatim; decide in Phase 3 whether the UI shows it as-is or renders it as a separate header line *without* altering stored data (display-only split, verified against the exact basmalah string from 1:1).
