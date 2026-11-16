// Global ayah index math (0 … total-1) and parsing of user-typed references.
// Pure: no VS Code, no I/O. Built from data/meta.json so counts are never hard-coded.

import type { AyahRef, SurahMeta } from './types';

export type ParseResult =
  | { ok: true; index: number }
  | { ok: false; error: string };

/** Lowercase, keep only a–z/0–9, collapse doubled letters, drop a trailing "h". */
function normalizeLatin(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(.)\1+/g, '$1')
    .replace(/h$/, '');
}

/** Drop a leading Arabic article transliteration (al-, an-, ash-, …). */
function stripArticle(s: string): string {
  return s.replace(/^(al|an|ar|as|ash|at|ad|adh|az|aal)(?=[a-z])/, '');
}

/** Consonant skeleton: tolerant of vowel spelling (Yaseen/Yasin, Baqara/Baqarah). */
function skeleton(s: string): string {
  return s.charAt(0) + s.slice(1).replace(/[aeiouy]/g, '');
}

export class QuranIndex {
  readonly total: number;
  private readonly surahs: readonly SurahMeta[];
  private readonly keys: { surah: number; full: string; bare: string; skel: string }[];

  constructor(meta: readonly SurahMeta[]) {
    if (meta.length === 0) throw new Error('QuranIndex: empty metadata');
    this.surahs = meta;
    this.total = meta.reduce((n, s) => n + s.ayahCount, 0);
    this.keys = meta.map((s) => {
      const full = normalizeLatin(s.nameLatin);
      const bare = stripArticle(full);
      return { surah: s.number, full, bare, skel: skeleton(bare) };
    });
  }

  get surahCount(): number {
    return this.surahs.length;
  }

  surah(number: number): SurahMeta {
    const s = this.surahs[number - 1];
    if (!s) throw new RangeError(`surah ${number} out of range`);
    return s;
  }

  isValidIndex(index: number): boolean {
    return Number.isInteger(index) && index >= 0 && index < this.total;
  }

  toRef(index: number): AyahRef {
    if (!this.isValidIndex(index)) throw new RangeError(`index ${index} out of range`);
    // Binary search for the surah whose range contains index.
    let lo = 0;
    let hi = this.surahs.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.surahs[mid].startIndex <= index) lo = mid;
      else hi = mid - 1;
    }
    const s = this.surahs[lo];
    return { surah: s.number, ayah: index - s.startIndex + 1 };
  }

  fromRef(surah: number, ayah: number): number {
    const s = this.surah(surah);
    if (!Number.isInteger(ayah) || ayah < 1 || ayah > s.ayahCount) {
      throw new RangeError(`${s.nameLatin} has ${s.ayahCount} ayat; ${ayah} is out of range`);
    }
    return s.startIndex + ayah - 1;
  }

  /** `(index + delta)` wrapped into 0 … total-1. */
  wrap(index: number, delta: number): number {
    return (((index + delta) % this.total) + this.total) % this.total;
  }

  formatRef(index: number): string {
    const { surah, ayah } = this.toRef(index);
    return `${surah}:${ayah}`;
  }

  /**
   * Parse "2:255", "2 255", "2.255", "2", "al-baqarah 255", "Baqara:255", "yasin",
   * or an Arabic surah name. A surah without an ayah means ayah 1.
   */
  parseRef(input: string): ParseResult {
    const text = input.trim();
    if (text === '') return { ok: false, error: 'Type a reference like 2:255 or al-baqarah 255.' };

    const m = /^(.*?)\s*[:.\s]\s*(\d+)$/.exec(text);
    const namePart = m && m[1] !== '' ? m[1] : text;
    const ayah = m && m[1] !== '' ? Number(m[2]) : 1;

    const surah = /^\d+$/.test(namePart) ? Number(namePart) : this.findSurah(namePart);
    if (typeof surah === 'string') return { ok: false, error: surah };
    if (surah < 1 || surah > this.surahs.length) {
      return { ok: false, error: `Surah number must be 1–${this.surahs.length}.` };
    }
    const s = this.surah(surah);
    if (ayah < 1 || ayah > s.ayahCount) {
      return { ok: false, error: `${s.nameLatin} (${s.number}) has ${s.ayahCount} ayat.` };
    }
    return { ok: true, index: s.startIndex + ayah - 1 };
  }

  /** Surah number for a name, or an error message. */
  private findSurah(name: string): number | string {
    const arabic = this.surahs.find((s) => s.nameArabic === name.trim());
    if (arabic) return arabic.number;

    const full = normalizeLatin(name);
    if (full === '') return `Unknown surah "${name}".`;
    const bare = stripArticle(full);
    const tiers: ((k: QuranIndex['keys'][number]) => boolean)[] = [
      (k) => k.full === full,
      (k) => k.bare === bare,
      (k) => k.skel === skeleton(bare),
    ];
    for (const match of tiers) {
      const hits = this.keys.filter(match);
      if (hits.length === 1) return hits[0].surah;
      if (hits.length > 1) {
        const names = hits.map((h) => `${this.surah(h.surah).nameLatin} (${h.surah})`).join(', ');
        return `"${name}" is ambiguous: ${names}. Use the surah number.`;
      }
    }
    return `Unknown surah "${name}".`;
  }
}
