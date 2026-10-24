import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('OCR and Turkish character fixes across libraryData and all_sentences.json', async (t) => {
  const allSentences = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/data/json/all_sentences.json'), 'utf8')
  );
  const libraryContent = fs.readFileSync(path.join(rootDir, 'src/data/libraryData.ts'), 'utf8');

  await t.test('aux-11 s93 must be fixed to "Üç yıl içinde farklı bir ülkede yaşayacağım."', () => {
    const s93 = allSentences['aux-11']?.find((s) => s.id === 's93');
    assert.ok(s93, 'aux-11 s93 must exist in all_sentences.json');
    assert.equal(s93.turkish, 'Üç yıl içinde farklı bir ülkede yaşayacağım.');
    assert.match(
      libraryContent,
      /id:\s*"s93",\s*turkish:\s*"Üç yıl içinde farklı bir ülkede yaşayacağım\."/
    );
  });

  await t.test('aux-17 s93 must be fixed from "KG" to full Turkish translation', () => {
    const s93 = allSentences['aux-17']?.find((s) => s.id === 's93');
    assert.ok(s93, 'aux-17 s93 must exist in all_sentences.json');
    assert.equal(
      s93.turkish,
      'Kötü iş etiğine göre, muhtemelen önümüzdeki yıl bu şirket için çalışıyor olmayacaksın.'
    );
    assert.match(
      libraryContent,
      /id:\s*"s93",\s*turkish:\s*"Kötü iş etiğine göre, muhtemelen önümüzdeki yıl bu şirket için çalışıyor olmayacaksın\."/
    );
  });

  await t.test('modal-4 s93 must be fixed to proper Turkish without OCR typos', () => {
    const s93 = allSentences['modal-4']?.find((s) => s.id === 's93');
    assert.ok(s93, 'modal-4 s93 must exist in all_sentences.json');
    assert.equal(
      s93.turkish,
      'Altı saatlik tırmanıştan sonra, dağın zirvesine ulaşabildik.'
    );
    assert.match(
      libraryContent,
      /id:\s*"s93",\s*turkish:\s*"Altı saatlik tırmanıştan sonra, dağın zirvesine ulaşabildik\."/
    );
  });

  await t.test('modal-10 s33 must be fixed to "İspanya\'da öğretmenler üniforma giymek zorunda değiller."', () => {
    const s33 = allSentences['modal-10']?.find((s) => s.id === 's33');
    assert.ok(s33, 'modal-10 s33 must exist in all_sentences.json');
    assert.equal(s33.turkish, "İspanya'da öğretmenler üniforma giymek zorunda değiller.");
    assert.match(
      libraryContent,
      /id:\s*"s33",\s*turkish:\s*"İspanya'da öğretmenler üniforma giymek zorunda değiller\."/
    );
  });

  await t.test('aux-11 s59 must exist and be "Frank Tıp okuyacak."', () => {
    const s59 = allSentences['aux-11']?.find((s) => s.id === 's59');
    assert.ok(s59, 'aux-11 s59 must exist in all_sentences.json');
    assert.equal(s59.turkish, 'Frank Tıp okuyacak.');
    assert.match(
      libraryContent,
      /id:\s*"s59",\s*turkish:\s*"Frank Tıp okuyacak\."/
    );
  });

  await t.test('modal-12 s56 must not say "Öldüğün gibi" but "Olduğun gibi"', () => {
    const s56 = allSentences['modal-12']?.find((s) => s.id === 's56');
    assert.ok(s56, 'modal-12 s56 must exist in all_sentences.json');
    assert.equal(s56.turkish, 'Giysilerini değiştirmene ihtiyacın yok. Olduğun gibi dışarı çıkabilirsin.');
  });

  await t.test('modal-15 s59 must not say "Ölüm" but "Oğlum"', () => {
    const s59 = allSentences['modal-15']?.find((s) => s.id === 's59');
    assert.ok(s59, 'modal-15 s59 must exist in all_sentences.json');
    assert.equal(s59.turkish, 'Oğlum doktor olmak istiyor.');
  });
});
