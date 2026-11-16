// Tests for scripts/lib/tanzil.mjs using synthetic fixtures (placeholder strings, not Quran text).
import assert from 'node:assert/strict';
import {
  decodeUtf8,
  findVersion,
  parseMetadataXml,
  parseNumberedText,
  toIndexedTexts,
} from '../scripts/lib/tanzil.mjs';

const small = { totalSurahs: 2, totalAyat: 5 };
const xml = `<?xml version="1.0"?>
<quran><suras alias="chapters">
  <sura index="1" ayas="3" start="0" name="ألف" tname="Alif" ename="First &amp; One" type="Meccan" order="1" rukus="1" />
  <sura index="2" ayas="2" start="3" name="باء" tname="Ba" ename="Second" type="Medinan" order="2" rukus="1" />
</suras></quran>`;
const meta = parseMetadataXml(xml, small);

describe('parseMetadataXml', () => {
  it('maps attributes and decodes entities', () => {
    assert.deepEqual(meta[0], {
      number: 1, nameArabic: 'ألف', nameLatin: 'Alif', nameTranslation: 'First & One',
      ayahCount: 3, startIndex: 0, revelation: 'Meccan',
    });
    assert.equal(meta[1].startIndex, 3);
  });
  it('rejects wrong surah count', () => {
    assert.throws(() => parseMetadataXml(xml), /expected 114 surahs/);
  });
  it('rejects inconsistent start index', () => {
    assert.throws(() => parseMetadataXml(xml.replace('start="3"', 'start="4"'), small), /start 4, expected 3/);
  });
  it('rejects wrong ayah total', () => {
    assert.throws(() => parseMetadataXml(xml, { totalSurahs: 2, totalAyat: 6 }), /sum to 5/);
  });
});

describe('parseNumberedText', () => {
  const file = [
    '1|1|ayah-1-1', '1|2|  spaced  text  ', '1|3|x|y', '2|1|ayah-2-1', '2|2|ayah-2-2', '',
    '#  License block', '# Version: 1.2',
  ].join('\r\n');

  it('keeps text exactly, including surrounding spaces and pipes', () => {
    const { records } = parseNumberedText(file, 't');
    assert.equal(records[1].text, '  spaced  text  ');
    assert.equal(records[2].text, 'x|y');
  });
  it('returns comment lines verbatim and finds version', () => {
    const { comments } = parseNumberedText(file, 't');
    assert.deepEqual(comments, ['#  License block', '# Version: 1.2']);
    assert.equal(findVersion(comments), '1.2');
  });
  it('rejects malformed lines', () => {
    assert.throws(() => parseNumberedText('1|1|ok\nnot a record', 't'), /line 2/);
  });
  it('rejects empty ayah text', () => {
    assert.throws(() => parseNumberedText('1|1|', 't'), /empty text/);
  });
});

describe('toIndexedTexts', () => {
  const ok = '1|1|a\n1|2|b\n1|3|c\n2|1|d\n2|2|e';
  it('returns texts in global index order', () => {
    assert.deepEqual(toIndexedTexts(parseNumberedText(ok, 't').records, meta, 't'), ['a', 'b', 'c', 'd', 'e']);
  });
  it('rejects missing ayah', () => {
    const r = parseNumberedText('1|1|a\n1|2|b\n2|1|d\n2|2|e', 't').records;
    assert.throws(() => toIndexedTexts(r, meta, 't'), /expected 5 ayat/);
  });
  it('rejects out-of-order ayat', () => {
    const r = parseNumberedText('1|1|a\n1|3|c\n1|2|b\n2|1|d\n2|2|e', 't').records;
    assert.throws(() => toIndexedTexts(r, meta, 't'), /is 1:3, expected 1:2/);
  });
});

describe('decodeUtf8', () => {
  it('strips BOM and rejects invalid UTF-8', () => {
    assert.equal(decodeUtf8(Buffer.from([0xef, 0xbb, 0xbf, 0x61])), 'a');
    assert.throws(() => decodeUtf8(Buffer.from([0xff, 0xfe, 0x00])));
  });
});
