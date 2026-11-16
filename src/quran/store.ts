// Lazy loader for the generated files in data/. Nothing is read until first use,
// and each file is read at most once (concurrent callers share the same promise).

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { QuranIndex } from './index';
import type { SurahMeta } from './types';

export const TRANSLATION_IDS = ['id.indonesian', 'en.sahih'] as const;
export type TranslationId = (typeof TRANSLATION_IDS)[number];

/** Shown under every translation so it is never mistaken for the Quran text itself. */
export const TRANSLATION_CREDITS: Record<TranslationId, { language: string; translator: string }> = {
  'id.indonesian': { language: 'Bahasa Indonesia', translator: 'Kementerian Agama RI' },
  'en.sahih': { language: 'English', translator: 'Saheeh International' },
};

/** Shape of data/quran-uthmani.json and data/trans/*.json. */
export interface TextFile {
  /** Source copyright/credit block, verbatim. Must stay with the text. */
  notice: string[];
  ayat: string[];
}

export function isTranslationId(value: unknown): value is TranslationId {
  return (TRANSLATION_IDS as readonly unknown[]).includes(value);
}

export class QuranStore {
  private indexP?: Promise<QuranIndex>;
  private quranP?: Promise<TextFile>;
  private readonly translations = new Map<TranslationId, Promise<TextFile>>();

  constructor(private readonly dataDir: string) {}

  index(): Promise<QuranIndex> {
    this.indexP ??= this.readJson<SurahMeta[]>('meta.json').then((m) => new QuranIndex(m));
    return this.indexP;
  }

  quran(): Promise<TextFile> {
    this.quranP ??= this.readText('quran-uthmani.json');
    return this.quranP;
  }

  translation(id: TranslationId): Promise<TextFile> {
    let p = this.translations.get(id);
    if (!p) {
      p = this.readText(`trans/${id}.json`);
      this.translations.set(id, p);
    }
    return p;
  }

  private async readText(rel: string): Promise<TextFile> {
    const [file, index] = await Promise.all([this.readJson<TextFile>(rel), this.index()]);
    if (!Array.isArray(file.ayat) || file.ayat.length !== index.total) {
      throw new Error(`${rel}: expected ${index.total} ayat`);
    }
    if (!Array.isArray(file.notice) || file.notice.length === 0) {
      throw new Error(`${rel}: missing source notice`);
    }
    return file;
  }

  private async readJson<T>(rel: string): Promise<T> {
    return JSON.parse(await readFile(join(this.dataDir, rel), 'utf8')) as T;
  }
}
