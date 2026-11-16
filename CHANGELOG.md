# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Project scaffold: strict TypeScript, esbuild bundle, ESLint with rules that forbid network APIs, F5 launch config.
- `npm run build:data`: parses Tanzil sources into `data/`, pins each source by SHA-256, checks 6,236 ayat against surah metadata, and verifies every ayah round-trips byte-for-byte.
- Reader core: global index ↔ `surah:ayah` conversion, reference parsing (`2:255`, `al-baqarah 255`, `yasin`, Arabic names), lazy data store, and continuous/random reader with persisted bookmark and 50-entry random history.
- Bundled data: Tanzil Uthmani text v1.1, surah metadata, Indonesian (Kemenag) and English (Saheeh International) translations, each with its source notice.
- Bundled font: Amiri Quran 1.003 (SIL OFL 1.1).
- MIT `LICENSE` for code and `NOTICE.md` for third-party data, fonts and trademarks.
