// Pure parsing/validation helpers for Tanzil source files.
// Rule: ayah text is never altered. We only split lines and strip line endings,
// and every parsed record is checked to round-trip to its exact source line.

import { createHash } from 'node:crypto';

export const TOTAL_AYAT = 6236;
export const TOTAL_SURAHS = 114;

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/** Decode UTF-8 strictly (throws on invalid bytes) and drop a leading BOM. */
export function decodeUtf8(buf) {
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(buf);
  return text;
}

/** Split into lines, removing only the line terminator (\n or \r\n). */
export function splitLines(text) {
  return text.split('\n').map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
}

const DATA_LINE = /^(\d+)\|(\d+)\|(.*)$/s;

/**
 * Parse a Tanzil "text with aya numbers" file (`sura|aya|text`).
 * Lines starting with '#' are comments (license/credits) and are returned verbatim.
 * @returns {{ records: {surah:number, ayah:number, text:string}[], comments: string[] }}
 */
export function parseNumberedText(text, label) {
  const records = [];
  const comments = [];
  splitLines(text).forEach((line, i) => {
    if (line === '') return;
    if (line.startsWith('#')) {
      comments.push(line);
      return;
    }
    const m = DATA_LINE.exec(line);
    if (!m) throw new Error(`${label}: line ${i + 1} is not "sura|aya|text" or a # comment`);
    const rec = { surah: Number(m[1]), ayah: Number(m[2]), text: m[3] };
    if (`${rec.surah}|${rec.ayah}|${rec.text}` !== line) {
      throw new Error(`${label}: line ${i + 1} does not round-trip to its source bytes`);
    }
    if (rec.text.length === 0) throw new Error(`${label}: ${rec.surah}:${rec.ayah} has empty text`);
    records.push(rec);
  });
  return { records, comments };
}

/**
 * Identify the source revision from Tanzil comment lines.
 * Quran text uses "(Uthmani, Version 1.1)"; translations use "Last Update: June 4, 2010".
 */
export function findVersion(comments) {
  for (const c of comments) {
    const m = /\bVersion[:\s]+([0-9][\w.]*)/i.exec(c);
    if (m) return m[1];
  }
  for (const c of comments) {
    const m = /^#\s*Last Update:\s*(.+?)\s*$/i.exec(c);
    if (m) return m[1];
  }
  return null;
}

const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };

function decodeXmlAttr(value, label) {
  return value.replace(/&(\w+);/g, (_, name) => {
    if (!(name in ENTITIES)) throw new Error(`${label}: unsupported XML entity &${name};`);
    return ENTITIES[name];
  });
}

/**
 * Parse surah metadata from Tanzil quran-data.xml.
 * @returns {{number:number, nameArabic:string, nameLatin:string, nameTranslation:string,
 *            ayahCount:number, startIndex:number, revelation:string}[]}
 */
export function parseMetadataXml(xml, { totalSurahs = TOTAL_SURAHS, totalAyat = TOTAL_AYAT } = {}) {
  const label = 'quran-data.xml';
  const surahs = [];
  for (const m of xml.matchAll(/<sura\s([^>]*?)\/?>/g)) {
    const attrs = {};
    for (const a of m[1].matchAll(/(\w+)="([^"]*)"/g)) attrs[a[1]] = decodeXmlAttr(a[2], label);
    for (const k of ['index', 'ayas', 'start', 'name', 'tname', 'ename', 'type']) {
      if (attrs[k] === undefined) throw new Error(`${label}: <sura> missing attribute "${k}"`);
    }
    surahs.push({
      number: Number(attrs.index),
      nameArabic: attrs.name,
      nameLatin: attrs.tname,
      nameTranslation: attrs.ename,
      ayahCount: Number(attrs.ayas),
      startIndex: Number(attrs.start),
      revelation: attrs.type,
    });
  }
  if (surahs.length !== totalSurahs) {
    throw new Error(`${label}: expected ${totalSurahs} surahs, found ${surahs.length}`);
  }
  let start = 0;
  surahs.forEach((s, i) => {
    if (s.number !== i + 1) throw new Error(`${label}: surah #${i + 1} has index ${s.number}`);
    if (!Number.isInteger(s.ayahCount) || s.ayahCount < 1) {
      throw new Error(`${label}: surah ${s.number} has invalid ayah count`);
    }
    if (s.startIndex !== start) {
      throw new Error(`${label}: surah ${s.number} start ${s.startIndex}, expected ${start}`);
    }
    start += s.ayahCount;
  });
  if (start !== totalAyat) throw new Error(`${label}: ayah counts sum to ${start}, expected ${totalAyat}`);
  return surahs;
}

/**
 * Check records cover every surah:ayah exactly once, in order, per metadata.
 * @returns {string[]} texts indexed by global ayah index.
 */
export function toIndexedTexts(records, meta, label) {
  const expected = meta.reduce((n, s) => n + s.ayahCount, 0);
  if (records.length !== expected) {
    throw new Error(`${label}: expected ${expected} ayat, found ${records.length}`);
  }
  let i = 0;
  for (const s of meta) {
    for (let a = 1; a <= s.ayahCount; a++, i++) {
      const r = records[i];
      if (r.surah !== s.number || r.ayah !== a) {
        throw new Error(`${label}: record ${i + 1} is ${r.surah}:${r.ayah}, expected ${s.number}:${a}`);
      }
    }
  }
  return records.map((r) => r.text);
}
