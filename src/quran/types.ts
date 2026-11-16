/** One surah's metadata, as generated into data/meta.json by scripts/build-data.mjs. */
export interface SurahMeta {
  number: number;
  nameArabic: string;
  nameLatin: string;
  nameTranslation: string;
  ayahCount: number;
  startIndex: number;
  revelation: string;
}

/** A position as humans write it, e.g. 2:255. Both parts are 1-based. */
export interface AyahRef {
  surah: number;
  ayah: number;
}
