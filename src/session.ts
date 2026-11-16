// Builds what the webview renders. Pure (no VS Code): the extension passes in settings.

import { splitBasmalah } from './quran/display';
import { isTranslationId, TRANSLATION_CREDITS, type QuranStore, type TranslationId } from './quran/store';
import type { Mode } from './reader';

export type TranslationSetting = TranslationId | 'none';

export interface ReaderSettings {
  mode: Mode;
  translation: TranslationSetting;
  showTranslation: boolean;
  arabicFontSize: number;
}

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 72;

/** Message sent to the webview: `{ type: 'render', payload }`. Mirrored in media/reader.js. */
export interface RenderPayload {
  index: number;
  ref: string;
  surah: number;
  ayah: number;
  surahNameArabic: string;
  surahNameLatin: string;
  basmalah?: string;
  text: string;
  translation?: { text: string; label: string };
  translationAvailable: boolean;
  showTranslation: boolean;
  mode: Mode;
  arabicFontSize: number;
}

/**
 * Translation to use. An explicit user choice wins; otherwise Indonesian for an
 * Indonesian VS Code UI and English for everything else.
 */
export function resolveTranslation(value: unknown, explicitlySet: boolean, locale: string): TranslationSetting {
  if (explicitlySet && (value === 'none' || isTranslationId(value))) return value;
  return locale.toLowerCase().startsWith('id') ? 'id.indonesian' : 'en.sahih';
}

export function clampFontSize(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 28;
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, n));
}

export async function buildPayload(store: QuranStore, index: number, settings: ReaderSettings): Promise<RenderPayload> {
  const [qIndex, quran] = await Promise.all([store.index(), store.quran()]);
  const { surah, ayah } = qIndex.toRef(index);
  const meta = qIndex.surah(surah);
  const parts = splitBasmalah(quran.ayat[index], surah, ayah, quran.ayat[0]);

  const translationAvailable = settings.translation !== 'none';
  let translation: RenderPayload['translation'];
  if (translationAvailable && settings.showTranslation && settings.translation !== 'none') {
    const t = await store.translation(settings.translation);
    const c = TRANSLATION_CREDITS[settings.translation];
    translation = { text: t.ayat[index], label: `${c.language} — ${c.translator} (translation)` };
  }

  return {
    index,
    ref: `${surah}:${ayah}`,
    surah,
    ayah,
    surahNameArabic: meta.nameArabic,
    surahNameLatin: meta.nameLatin,
    basmalah: parts.basmalah,
    text: parts.body,
    translation,
    translationAvailable,
    showTranslation: settings.showTranslation,
    mode: settings.mode,
    arabicFontSize: clampFontSize(settings.arabicFontSize),
  };
}

/** Message sent to the webview for "Translate selection": `{ type: 'selectionTranslation', payload }`. */
export interface SelectionTranslation {
  items: { ref: string; text: string }[];
  label: string;
}

export const MAX_SELECTION_AYAT = 3;

/**
 * Look up the bundled human translation for the ayat a selection touched. Never machine
 * translation. Index 0 is used for the basmalah header (its translation is that of 1:1).
 * Invalid indices are dropped; returns undefined if nothing valid remains.
 */
export async function translateSelection(
  store: QuranStore,
  indices: unknown,
  translation: TranslationSetting,
  locale: string,
): Promise<SelectionTranslation | undefined> {
  const qIndex = await store.index();
  const valid = Array.isArray(indices)
    ? [...new Set(indices)].filter((i): i is number => typeof i === 'number' && qIndex.isValidIndex(i))
    : [];
  if (valid.length === 0) return undefined;
  const id = translation === 'none' ? resolveTranslation(undefined, false, locale) : translation;
  if (id === 'none') return undefined;
  const t = await store.translation(id);
  const c = TRANSLATION_CREDITS[id];
  return {
    items: valid
      .sort((a, b) => a - b)
      .slice(0, MAX_SELECTION_AYAT)
      .map((i) => ({ ref: qIndex.formatRef(i), text: t.ayat[i] })),
    label: `${c.language} — ${c.translator} (translation)`,
  };
}
