# Implementation Plan

Each phase ends in a working, testable state. Check items off as they land.

## Phase 0 — Scaffold
- [x] `git init`, `.gitignore`, `.vscodeignore`, MIT `LICENSE`.
- [x] `package.json` with identity from SPEC §1, `engines.vscode`, `main: dist/extension.js`, empty `contributes`.
- [x] TypeScript (`strict`), esbuild bundle script, ESLint.
- [x] `src/extension.ts` with `activate`/`deactivate`; activation on `onStartupFinished` + view/command events.
- [x] `.vscode/launch.json` for F5 Extension Development Host.
- **Done when:** F5 launches and the extension activates with no errors. ✅ (verified with F5)

## Phase 1 — Data pipeline
- [x] Download (manually, once) into `data-src/` (git-ignored): Tanzil `quran-uthmani.txt` (with ayah numbers), `quran-data.xml` (surah metadata), translations `id.indonesian.txt`, `en.sahih.txt`.
- [x] `scripts/sources.json`: URL, Tanzil version/date and SHA-256 for each raw file; `build-data.mjs` verifies hashes before parsing.
- [x] `scripts/build-data.mjs`: parse → emit `data/quran-uthmani.json`, `data/meta.json`, `data/trans/*.json`.
- [x] Validation in the script: exactly 6,236 ayat; ayah counts per surah match metadata; text is byte-identical to source lines (no trimming beyond line endings).
- [x] Copy Tanzil license text to `data/LICENSE-TANZIL.txt` (automated by `build-data.mjs`; notice also embedded in each JSON).
- [x] Add font + its license to `media/fonts/` (Amiri Quran 1.003, SIL OFL).
- **Done when:** `npm run build:data` produces the files and validation passes. ✅

## Phase 2 — Reader core (no UI)
- [x] `src/quran/index.ts`: `toRef(index) → {surah, ayah}`, `fromRef(surah, ayah) → index`, `parseRef("2:255" | "al-baqarah 255")`.
- [x] `src/quran/store.ts`: lazy loads text/meta/translation JSON.
- [x] `src/reader.ts`: state machine for continuous + random modes, bookmark in `globalState`, random history (cap 50), wrap-around.
- [x] Unit tests (mocha) for index math, parsing, wrap, random history.
- **Done when:** tests pass. ✅

## Phase 3 — Webview panel
- [x] Contribute `viewsContainers.panel` + `views` (`quranForClaudeCode.reader`, type `webview`).
- [x] `src/view/ReaderViewProvider.ts` with strict CSP + nonce, `localResourceRoots`.
- [x] `media/reader.html|css|js`: header (surah · ref), Arabic (RTL, bundled font), translation, Prev / Next / Mode / Translation buttons, keyboard shortcuts.
- [x] Message protocol (incl. `translateSelection`): webview → ext `{type: 'next'|'prev'|'toggleMode'|'toggleTranslation'|'translateSelection', text?}`; ext → webview `{type: 'render', ayah}`.
- [x] Theme via `--vscode-*` variables.
- [ ] Manual check in light, dark and high-contrast themes.
- **Done when:** user can open the panel and read with Prev/Next in both modes; bookmark survives reload. _(F5: panel renders 1:1 with Amiri Quran, labelled translation and controls in dark theme; still to check: basmalah header, bookmark after reload, light/high-contrast themes)_

## Phase 4 — Status bar, commands, settings
- [x] Status bar item with on/off, tooltip, busy spinner (`setBusy` ready; driven by Phase 5).
- [x] All settings from SPEC §4; commands toggle, next, prev, toggleMode, goTo, resetBookmark. (translateSelection → Phase 6, install/uninstallHooks → Phase 5, about → Phase 7.)
- [x] React to `onDidChangeConfiguration`.
- [x] `Go to Ayah…` quick input with live validation.
- **Done when:** every command works from the Command Palette. _(pending F5 check)_

## Phase 5 — Claude Code integration
- [x] `src/claude/stateWatcher.ts`: watch `~/.quran-for-claude-code/state`, parse, stale check, emit `busy`/`idle` events (debounced).
- [x] Wire: on `idle→busy` → reveal (preserveFocus) + advance per settings.
- [x] `src/claude/hooks.ts`: read/merge/backup `~/.claude/settings.json`; idempotent install; uninstall only tagged entries. Tolerate missing file / invalid JSON (abort with message, never clobber).
- [x] Unit tests for merge/uninstall on fixtures (empty, existing hooks, already installed, malformed).
- [x] First-run info message offering hook install (dismissable forever).
- [x] Manual test with real Claude Code (WSL, VS Code 1.146): install kept existing hooks and wrote a backup (`settings.json` == backup + our 3 hooks, verified); prompt wrote `busy`; status bar spinner shows while Claude works and stops after Stop.
- **Done when:** end-to-end works in VS Code on Linux/WSL and macOS. _(verified on Linux/WSL; macOS pending)_

## Phase 6 — Translate selection
- [x] In webview: detect selection inside ayah element; context menu via `webview/context` contribution + `data-vscode-context`; `S` key handled inside the webview (no global keybinding).
- [x] Map selection → ayah index(es) (`data-index` attributes) → show translation popover with translator label.
- **Done when:** selecting Arabic text and invoking the command shows the right translation. _(lookup unit-tested; pending F5 check)_

## Phase 7 — Polish & QA
- [x] About view / command with attribution (Tanzil, translators, font, trademark notice); Tanzil credit line in the panel.
- [x] Verify no network: bundle has no `fetch`/`XMLHttpRequest`/`http`/`net`/WebSocket; only URL is the tanzil.net attribution link.
- [ ] Run with network disabled (manual).
- [x] Data load < 200 ms: first render (meta + Quran + translation) 51–90 ms in Node.
- [ ] Activation < 50 ms: check in *Developer: Show Running Extensions* (manual).
- [x] Accessibility: buttons have text labels; `lang="ar"` + `dir="rtl"` on Arabic; popover close has `aria-label`.
- [ ] Screen reader check (manual).
- [x] Text accuracy: all 6,236 ayat verified byte-identical to the SHA-256-pinned Tanzil download (build script + independent Python check).
- [ ] Spot-check 20+ ayat against tanzil.net in a browser (manual).
- [x] README with settings table, privacy statement, attribution, trademark disclaimer. CHANGELOG. CONTRIBUTING.
- [ ] Demo GIF for README (needs a screen recording).
- [x] 128×128 PNG icon (original artwork, generated by `scripts/build-icon.mjs`).

## Phase 8 — Publish
- [ ] Create Azure DevOps org + PAT (Marketplace → Manage), create publisher, set `publisher` in `package.json`.
  - Currently `publisher: "local"` for a local install (extension ID `local.quran-for-claude-code`). Changing it changes the extension ID, so the bookmark in `globalState` starts over.
- [ ] Add `repository` to `package.json` and drop `--allow-missing-repository --no-rewrite-relative-links` from the `package` script, so README links point at the repo.
- [ ] `vsce package` → install `.vsix` locally → smoke test.
- [ ] `vsce publish` (VS Code Marketplace) and `ovsx publish` (Open VSX).
- [ ] Tag `v0.1.0`, GitHub release with `.vsix`.

## Open questions
1. ~~**Remote / WSL:** decide `extensionKind` order.~~ Decided: `["workspace", "ui"]` (SPEC §8). Still needs a manual test in Remote-WSL and Remote-SSH during Phase 5.
2. ~~**Windows native:**~~ Done: `gitbash` and `powershell` hook variants (install asks on native Windows), state read from `%USERPROFILE%`. All variants run successfully in real sh, Git Bash and Windows PowerShell 5.1. Still untested: a full run with Claude Code itself on native Windows, and how old a Claude Code version supports the hook `shell` field.
3. **Multiple concurrent Claude sessions:** v1 uses a single state file (last writer wins). Consider per-session files keyed by `session_id` from hook stdin later. Multiple VS Code *windows* are handled (shared bookmark re-read before each move; per-turn claim in globalState); multiple *Claude sessions* still share one file.
4. ~~**Font choice:** KFGQPC HAFS vs Amiri Quran.~~ Decided: Amiri Quran 1.003 (OFL), full code-point coverage verified.
5. ~~**Default translation:**~~ Decided: bundle Kemenag (Indonesian) + Saheeh International (English); default English for everyone (no locale detection); switch via the panel's translation button or **Quran: Choose Translation…**.
6. ~~**Basmalah in ayah 1:**~~ Decided: display-only split into a header line (`src/quran/display.ts`). Matches on letters ignoring diacritics (95:1 and 97:1 spell it with an extra shadda); shown text keeps the source marks and always re-joins to the exact stored ayah (tested for all 112 surahs).
7. ~~**Revealing a never-opened panel.**~~ Solved: VS Code registers a `<viewId>.open` command for every view that accepts `{ preserveFocus: true }` (verified in the VS Code 1.146 workbench source). `reveal()` uses `view.show(true)` when the view exists, otherwise that command; it never falls back to `.focus`. Still to confirm: the oldest VS Code version that has it (engines says ^1.90).
