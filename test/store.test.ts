import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { QuranStore, isTranslationId, TRANSLATION_IDS } from '../src/quran/store';

const dataDir = join(__dirname, '..', 'data');

describe('QuranStore (bundled data)', () => {
  const store = new QuranStore(dataDir);

  it('loads the index from meta.json', async () => {
    assert.equal((await store.index()).total, 6236);
  });
  it('loads the Quran text with its Tanzil notice', async () => {
    const q = await store.quran();
    assert.equal(q.ayat.length, 6236);
    assert.ok(q.notice.some((l) => l.includes('Tanzil')));
  });
  it('loads every bundled translation', async () => {
    for (const id of TRANSLATION_IDS) {
      const t = await store.translation(id);
      assert.equal(t.ayat.length, 6236, id);
      assert.ok(t.notice.length > 0, id);
    }
  });
  it('reads each file once', async () => {
    assert.equal(store.quran(), store.quran());
    assert.equal(store.translation('en.sahih'), store.translation('en.sahih'));
  });
});

describe('QuranStore (broken data)', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'qfcc-store-'));
    copyFileSync(join(dataDir, 'meta.json'), join(dir, 'meta.json'));
    mkdirSync(join(dir, 'trans'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('rejects a text file with the wrong ayah count', async () => {
    writeFileSync(join(dir, 'quran-uthmani.json'), JSON.stringify({ notice: ['n'], ayat: ['x'] }));
    await assert.rejects(new QuranStore(dir).quran(), /expected 6236 ayat/);
  });
  it('rejects a text file without its notice', async () => {
    writeFileSync(join(dir, 'trans', 'en.sahih.json'), JSON.stringify({ notice: [], ayat: Array(6236).fill('x') }));
    await assert.rejects(new QuranStore(dir).translation('en.sahih'), /missing source notice/);
  });
});

describe('isTranslationId', () => {
  it('accepts only bundled ids', () => {
    assert.equal(isTranslationId('en.sahih'), true);
    assert.equal(isTranslationId('none'), false);
    assert.equal(isTranslationId(undefined), false);
  });
});
