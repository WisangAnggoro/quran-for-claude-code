import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QuranIndex } from '../src/quran/index';
import type { SurahMeta } from '../src/quran/types';

const meta: SurahMeta[] = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'meta.json'), 'utf8'));
const q = new QuranIndex(meta);

function parsed(input: string): string {
  const r = q.parseRef(input);
  return r.ok ? q.formatRef(r.index) : `error: ${r.error}`;
}

describe('QuranIndex math', () => {
  it('has 6236 ayat in 114 surahs', () => {
    assert.equal(q.total, 6236);
    assert.equal(q.surahCount, 114);
  });
  it('converts the edges', () => {
    assert.deepEqual(q.toRef(0), { surah: 1, ayah: 1 });
    assert.deepEqual(q.toRef(6), { surah: 1, ayah: 7 });
    assert.deepEqual(q.toRef(7), { surah: 2, ayah: 1 });
    assert.deepEqual(q.toRef(6235), { surah: 114, ayah: 6 });
    assert.equal(q.fromRef(2, 255), 261);
    assert.equal(q.fromRef(9, 1), 1235);
  });
  it('round-trips every index', () => {
    for (let i = 0; i < q.total; i++) {
      const { surah, ayah } = q.toRef(i);
      assert.equal(q.fromRef(surah, ayah), i);
    }
  });
  it('rejects out-of-range values', () => {
    assert.throws(() => q.toRef(-1), RangeError);
    assert.throws(() => q.toRef(6236), RangeError);
    assert.throws(() => q.toRef(1.5), RangeError);
    assert.throws(() => q.fromRef(1, 8), /has 7 ayat/);
    assert.throws(() => q.fromRef(115, 1), RangeError);
  });
  it('wraps in both directions', () => {
    assert.equal(q.wrap(6235, 1), 0);
    assert.equal(q.wrap(0, -1), 6235);
    assert.equal(q.wrap(10, 6236), 10);
  });
});

describe('QuranIndex.parseRef', () => {
  it('parses numeric forms', () => {
    assert.equal(parsed('2:255'), '2:255');
    assert.equal(parsed(' 2 255 '), '2:255');
    assert.equal(parsed('2.255'), '2:255');
    assert.equal(parsed('114'), '114:1');
  });
  it('parses Latin names with common spellings', () => {
    assert.equal(parsed('al-baqarah 255'), '2:255');
    assert.equal(parsed('Al-Baqara:255'), '2:255');
    assert.equal(parsed('baqarah 255'), '2:255');
    assert.equal(parsed('al fatihah'), '1:1');
    assert.equal(parsed('yasin 1'), '36:1');
    assert.equal(parsed('AL-IKHLAS'), '112:1');
  });
  it('parses Arabic names', () => {
    assert.equal(parsed(`${meta[1].nameArabic} 255`), '2:255');
  });
  it('resolves every Tanzil Latin name to its own surah', () => {
    for (const s of meta) assert.equal(parsed(s.nameLatin), `${s.number}:1`, s.nameLatin);
  });
  it('explains errors', () => {
    assert.match(parsed(''), /error: Type a reference/);
    assert.match(parsed('1:8'), /error: .*has 7 ayat/);
    assert.match(parsed('115:1'), /error: Surah number must be 1–114/);
    assert.match(parsed('0'), /error: Surah number/);
    assert.match(parsed('notasurah 3'), /error: Unknown surah/);
  });
});
