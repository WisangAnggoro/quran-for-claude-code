// data-src/ (raw Tanzil downloads) → data/*.json, with validation.
// Usage:
//   npm run build:data                     verify hashes, parse, validate, write data/
//   npm run build:data -- --record-hashes  first run only: store sha256/version in sources.json
//
// This script never downloads anything. Fetch the files listed in scripts/sources.json by hand.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  decodeUtf8,
  findVersion,
  parseMetadataXml,
  parseNumberedText,
  sha256,
  toIndexedTexts,
} from './lib/tanzil.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'data-src');
const outDir = join(root, 'data');
const manifestPath = join(root, 'scripts', 'sources.json');
const recordHashes = process.argv.includes('--record-hashes');

function fail(msg) {
  console.error(`build:data: ${msg}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const entries = [manifest.quran, manifest.metadata, ...manifest.translations];

// 1. Presence + integrity.
const missing = entries.filter((e) => !existsSync(join(srcDir, e.file)));
if (missing.length) {
  fail(
    'missing source files in data-src/:\n' +
      missing.map((e) => `  - ${e.file}  (${e.url}${e.options ? `; ${e.options}` : ''})`).join('\n'),
  );
}

const raw = new Map(entries.map((e) => [e.file, readFileSync(join(srcDir, e.file))]));

for (const e of entries) {
  const hash = sha256(raw.get(e.file));
  if (recordHashes) {
    e.sha256 = hash;
  } else if (!e.sha256) {
    fail(`no sha256 recorded for ${e.file}; run \`npm run build:data -- --record-hashes\` once`);
  } else if (e.sha256 !== hash) {
    fail(`${e.file} does not match its recorded sha256 (expected ${e.sha256}, got ${hash})`);
  }
}

// 2. Parse + validate.
const meta = parseMetadataXml(decodeUtf8(raw.get(manifest.metadata.file)));

const quran = parseNumberedText(decodeUtf8(raw.get(manifest.quran.file)), manifest.quran.file);
const quranTexts = toIndexedTexts(quran.records, meta, manifest.quran.file);
if (quran.comments.length === 0) fail(`${manifest.quran.file}: no license comment block found`);

const translations = manifest.translations.map((t) => {
  const parsed = parseNumberedText(decodeUtf8(raw.get(t.file)), t.file);
  return { entry: t, parsed, texts: toIndexedTexts(parsed.records, meta, t.file) };
});

for (const [e, comments] of [
  [manifest.quran, quran.comments],
  ...translations.map((t) => [t.entry, t.parsed.comments]),
]) {
  const version = findVersion(comments);
  if (recordHashes) e.version = version;
  else if (e.version !== version) fail(`${e.file}: version "${version}" != recorded "${e.version}"`);
}

// 3. Write outputs.
function writeJson(rel, value) {
  const path = join(outDir, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value) + '\n');
  return path;
}

function writeText(rel, lines) {
  const path = join(outDir, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join('\n') + '\n');
}

const outputs = [[writeJson('quran-uthmani.json', quranTexts), quranTexts]];
writeJson('meta.json', meta);
writeText('LICENSE-TANZIL.txt', quran.comments);
for (const t of translations) {
  outputs.push([writeJson(`trans/${t.entry.id}.json`, t.texts), t.texts]);
  if (t.parsed.comments.length) writeText(`trans/${t.entry.id}.LICENSE.txt`, t.parsed.comments);
}

// 4. Read back: output must equal parsed source exactly.
for (const [path, expected] of outputs) {
  const back = JSON.parse(readFileSync(path, 'utf8'));
  if (back.length !== expected.length || back.some((s, i) => s !== expected[i])) {
    fail(`${path}: read-back does not match source text`);
  }
}

if (recordHashes) {
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('build:data: recorded sha256 and versions in scripts/sources.json — review and commit it.');
}
console.log(`build:data: OK — ${quranTexts.length} ayat, ${meta.length} surahs, ${translations.length} translations.`);
