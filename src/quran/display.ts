// Display-only helpers. Stored text is never changed: anything returned here is an
// exact substring of the source, and the parts always re-join to the original.

/** Arabic combining marks (harakat, shadda, small high/low signs). Used only for comparison. */
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;

function skeleton(word: string): string {
  return word.replace(MARKS, '');
}

export interface DisplayParts {
  /** Basmalah to show as a header line, exactly as it appears in the source text. */
  basmalah?: string;
  /** The rest of the ayah, exactly as in the source text. */
  body: string;
}

/**
 * Tanzil prefixes the basmalah to ayah 1 of every surah except Al-Fatihah (where it *is*
 * ayah 1) and At-Tawbah (which has none). Split it off for display so it can be shown as
 * a header, like a printed mushaf. Matching ignores diacritics because some surahs spell
 * it with an extra shadda (e.g. 95:1, 97:1); the returned strings keep the original marks.
 *
 * Invariant: when `basmalah` is set, `basmalah + ' ' + body === text`.
 */
export function splitBasmalah(text: string, surah: number, ayah: number, fatihahFirstAyah: string): DisplayParts {
  if (ayah !== 1 || surah === 1 || surah === 9) return { body: text };
  const ref = fatihahFirstAyah.split(' ');
  const words = text.split(' ');
  if (words.length <= ref.length) return { body: text };
  for (let i = 0; i < ref.length; i++) {
    if (skeleton(words[i]) !== skeleton(ref[i])) return { body: text };
  }
  const cut = words.slice(0, ref.length).join(' ').length;
  return { basmalah: text.slice(0, cut), body: text.slice(cut + 1) };
}
