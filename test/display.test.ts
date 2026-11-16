import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitBasmalah } from '../src/quran/display';
import type { SurahMeta } from '../src/quran/types';

const data = join(__dirname, '..', 'data');
const meta: SurahMeta[] = JSON.parse(readFileSync(join(data, 'meta.json'), 'utf8'));
const ayat: string[] = JSON.parse(readFileSync(join(data, 'quran-uthmani.json'), 'utf8')).ayat;
const fatihah1 = ayat[0];

describe('splitBasmalah (bundled Tanzil text)', () => {
  it('splits ayah 1 of all 112 surahs other than 1 and 9, re-joining to the exact source', () => {
    let split = 0;
    for (const s of meta) {
      const text = ayat[s.startIndex];
      const parts = splitBasmalah(text, s.number, 1, fatihah1);
      if (s.number === 1 || s.number === 9) {
        assert.deepEqual(parts, { body: text }, `surah ${s.number}`);
        continue;
      }
      assert.ok(parts.basmalah, `surah ${s.number} should split`);
      assert.ok(parts.body.length > 0, `surah ${s.number} body`);
      assert.equal(`${parts.basmalah} ${parts.body}`, text, `surah ${s.number} must re-join exactly`);
      split++;
    }
    assert.equal(split, 112);
  });
  it('keeps the source spelling of the basmalah (e.g. extra shadda in 95:1)', () => {
    const s95 = meta[94];
    const parts = splitBasmalah(ayat[s95.startIndex], 95, 1, fatihah1);
    assert.notEqual(parts.basmalah, fatihah1);
    assert.ok(ayat[s95.startIndex].startsWith(parts.basmalah ?? '\0'));
  });
  it('never splits other ayat', () => {
    assert.deepEqual(splitBasmalah(ayat[8], 2, 2, fatihah1), { body: ayat[8] });
  });
});
