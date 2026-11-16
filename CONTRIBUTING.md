# Contributing

Thanks for helping. Please read [`INTENT.md`](INTENT.md) first: its principles take priority over convenience. [`SPEC.md`](SPEC.md) describes the exact behaviour and [`PLAN.md`](PLAN.md) tracks progress.

## Rules that are never relaxed

1. **Never modify the Quran text.** Do not edit `data/quran-*.json` by hand, do not normalise, trim or "fix" Arabic text, and never type or generate ayat. Text comes only from Tanzil source files through `scripts/build-data.mjs`.
2. **No network.** No `fetch`, `http(s)`, `net`, `XMLHttpRequest`, remote URLs in the webview, telemetry or CDN assets. ESLint enforces part of this; reviewers check the rest.
3. **Never clobber user config.** Changes to `~/.claude/settings.json` need explicit confirmation, a backup, a merge (not a replace), idempotency, and must abort on invalid JSON.
4. **Never steal focus.** Revealing the panel always preserves focus.
5. **Unofficial branding.** Never imply Anthropic affiliation or use Anthropic logos or brand assets.
6. **Attribution stays.** Do not remove Tanzil, translator or font credits or license files.
7. **Translations are lookups.** No machine translation and no LLM calls.

## Setup

```sh
npm install
npm run build        # bundle to dist/
npm run lint
npm test
```

Press F5 in VS Code to launch an Extension Development Host.

## Rebuilding the data

`data/` is generated and committed. To rebuild it, download the files listed in [`scripts/sources.json`](scripts/sources.json) by hand into `data-src/` (git-ignored), then:

```sh
npm run build:data
```

The script refuses to run unless every file matches its recorded SHA-256, checks all 6,236 ayat against the surah metadata, and verifies that every ayah round-trips byte-for-byte. To move to a new Tanzil release, update the files, run `npm run build:data -- --record-hashes`, and explain the change in your pull request.

## Code layout

- Pure logic (index math, reader, hook merge, state parsing) has no VS Code imports and is unit-tested in `test/`.
- Ayah positions are global indices `0…6235` internally; convert to `surah:ayah` only for display and input.
- Config keys and command IDs are prefixed `quranForClaudeCode.`.
- Keep `activate()` cheap; data loads on first panel render.

## Pull requests

- Small, focused commits.
- `npm run lint && npm test` must pass.
- Update `CHANGELOG.md`, and `PLAN.md` checkboxes where relevant.
