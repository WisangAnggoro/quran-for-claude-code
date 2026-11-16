import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QuranStore } from '../src/quran/store';
import {
  buildPayload,
  clampFontSize,
  resolveTranslation,
  translateSelection,
  translationName,
  type ReaderSettings,
} from '../src/session';

const dataDir = join(__dirname, '..', 'data');
const ayat: string[] = JSON.parse(readFileSync(join(dataDir, 'quran-uthmani.json'), 'utf8')).ayat;
const sahih: string[] = JSON.parse(readFileSync(join(dataDir, 'trans', 'en.sahih.json'), 'utf8')).ayat;
const store = new QuranStore(dataDir);
const base: ReaderSettings = { mode: 'continuous', translation: 'en.sahih', showTranslation: true, arabicFontSize: 28 };

describe('resolveTranslation', () => {
  it('uses a valid configured value', () => {
    assert.equal(resolveTranslation('none'), 'none');
    assert.equal(resolveTranslation('id.indonesian'), 'id.indonesian');
  });
  it('defaults to English for missing or unknown values', () => {
    assert.equal(resolveTranslation(undefined), 'en.sahih');
    assert.equal(resolveTranslation('bogus'), 'en.sahih');
  });
});

describe('clampFontSize', () => {
  it('clamps and defaults', () => {
    assert.equal(clampFontSize(5), 12);
    assert.equal(clampFontSize(500), 72);
    assert.equal(clampFontSize('x'), 28);
    assert.equal(clampFontSize(30.4), 30);
  });
});

describe('buildPayload', () => {
  it('returns the exact stored text and translation for 2:255', async () => {
    const p = await buildPayload(store, 261, base);
    assert.equal(p.ref, '2:255');
    assert.equal(p.text, ayat[261]);
    assert.equal(p.basmalah, undefined);
    assert.equal(p.translation?.text, sahih[261]);
    assert.match(p.translation?.label ?? '', /Saheeh International.*translation/);
  });
  it('separates the basmalah on ayah 1 and keeps the full text recoverable', async () => {
    const p = await buildPayload(store, 7, base);
    assert.equal(p.ref, '2:1');
    assert.equal(`${p.basmalah} ${p.text}`, ayat[7]);
  });
  it('omits the translation when hidden or none', async () => {
    const hidden = await buildPayload(store, 0, { ...base, showTranslation: false });
    assert.equal(hidden.translation, undefined);
    assert.equal(hidden.translationAvailable, true);
    const none = await buildPayload(store, 0, { ...base, translation: 'none' });
    assert.equal(none.translation, undefined);
    assert.equal(none.translationAvailable, false);
  });
});

describe('translateSelection', () => {
  const indo: string[] = JSON.parse(readFileSync(join(dataDir, 'trans', 'id.indonesian.json'), 'utf8')).ayat;

  it('returns the exact bundled translation with its label', async () => {
    const r = await translateSelection(store, [261], 'en.sahih');
    assert.deepEqual(r?.items, [{ ref: '2:255', text: sahih[261] }]);
    assert.match(r?.label ?? '', /Saheeh International/);
  });
  it('dedupes, sorts, drops invalid indices and caps the count', async () => {
    const r = await translateSelection(store, [9, 7, 7, -1, 6236, 'x', 1.5, 8, 10], 'en.sahih');
    assert.deepEqual(r?.items.map((i) => i.ref), ['2:1', '2:2', '2:3']);
  });
  it('uses the chosen translation', async () => {
    const r = await translateSelection(store, [0], 'id.indonesian');
    assert.equal(r?.items[0].text, indo[0]);
    assert.match(r?.label ?? '', /Kementerian Agama/);
  });
  it('falls back to English when translation is "none"', async () => {
    const r = await translateSelection(store, [0], 'none');
    assert.equal(r?.items[0].text, sahih[0]);
  });
  it('returns undefined for nothing valid', async () => {
    assert.equal(await translateSelection(store, [], 'en.sahih'), undefined);
    assert.equal(await translateSelection(store, 'nope', 'en.sahih'), undefined);
  });
});

describe('translationName', () => {
  it('names each choice for the panel button', async () => {
    assert.equal(translationName('en.sahih'), 'English');
    assert.equal(translationName('id.indonesian'), 'Bahasa Indonesia');
    assert.equal(translationName('none'), 'No translation');
    assert.equal((await buildPayload(store, 0, { ...base, translation: 'id.indonesian' })).translationName, 'Bahasa Indonesia');
  });
});
