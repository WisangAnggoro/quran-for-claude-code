import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QuranStore } from '../src/quran/store';
import { buildPayload, clampFontSize, resolveTranslation, type ReaderSettings } from '../src/session';

const dataDir = join(__dirname, '..', 'data');
const ayat: string[] = JSON.parse(readFileSync(join(dataDir, 'quran-uthmani.json'), 'utf8')).ayat;
const sahih: string[] = JSON.parse(readFileSync(join(dataDir, 'trans', 'en.sahih.json'), 'utf8')).ayat;
const store = new QuranStore(dataDir);
const base: ReaderSettings = { mode: 'continuous', translation: 'en.sahih', showTranslation: true, arabicFontSize: 28 };

describe('resolveTranslation', () => {
  it('uses an explicit choice', () => {
    assert.equal(resolveTranslation('none', true, 'id'), 'none');
    assert.equal(resolveTranslation('en.sahih', true, 'id'), 'en.sahih');
  });
  it('falls back to the UI locale', () => {
    assert.equal(resolveTranslation('en.sahih', false, 'id'), 'id.indonesian');
    assert.equal(resolveTranslation(undefined, false, 'en-US'), 'en.sahih');
    assert.equal(resolveTranslation('bogus', true, 'ID'), 'id.indonesian');
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
