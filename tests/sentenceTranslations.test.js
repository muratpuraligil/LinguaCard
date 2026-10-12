import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Sentence s44 must have "on the board"', () => {
  const allSentences = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/data/json/all_sentences.json'), 'utf8')
  );
  const s44All = allSentences['aux-3']?.find((s) => s.id === 's44');
  assert.ok(s44All, 's44 must exist in all_sentences.json["aux-3"]');
  assert.equal(
    s44All.english,
    'There have been difficult questions on the board for an hour.',
    'all_sentences s44 english must be "There have been difficult questions on the board for an hour."'
  );

  const aux3Sentences = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/data/json/paired_sentences_aux3.json'), 'utf8')
  );
  const s44Aux3 = aux3Sentences.find((s) => s.id === 's44');
  assert.ok(s44Aux3, 's44 must exist in paired_sentences_aux3.json');
  assert.equal(
    s44Aux3.english,
    'There have been difficult questions on the board for an hour.',
    'paired_sentences_aux3 s44 english must be "There have been difficult questions on the board for an hour."'
  );

  const libraryContent = fs.readFileSync(path.join(rootDir, 'src/data/libraryData.ts'), 'utf8');
  assert.match(
    libraryContent,
    /id:\s*"s44",\s*turkish:\s*"Bir saattir tahtada zor sorular var\.",\s*english:\s*"There have been difficult questions on the board for an hour\."/,
    'libraryData.ts s44 must use "on the board"'
  );
});

test('Sentence s90 must have "The doctors"', () => {
  const allSentences = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/data/json/all_sentences.json'), 'utf8')
  );
  const s90All = allSentences['aux-3']?.find((s) => s.id === 's90');
  assert.ok(s90All, 's90 must exist in all_sentences.json["aux-3"]');
  assert.equal(
    s90All.english,
    'The doctors have been in the operating room for three hours.',
    'all_sentences s90 english must be "The doctors have been in the operating room for three hours."'
  );

  const aux3Sentences = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/data/json/paired_sentences_aux3.json'), 'utf8')
  );
  const s90Aux3 = aux3Sentences.find((s) => s.id === 's90');
  assert.ok(s90Aux3, 's90 must exist in paired_sentences_aux3.json');
  assert.equal(
    s90Aux3.english,
    'The doctors have been in the operating room for three hours.',
    'paired_sentences_aux3 s90 english must be "The doctors have been in the operating room for three hours."'
  );
  assert.equal(
    s90Aux3.turkish,
    'Doktorlar üç saattir ameliyathanedeler.',
    'paired_sentences_aux3 s90 turkish OCR error must be fixed'
  );

  const libraryContent = fs.readFileSync(path.join(rootDir, 'src/data/libraryData.ts'), 'utf8');
  assert.match(
    libraryContent,
    /id:\s*"s90",\s*turkish:\s*"Doktorlar üç saattir ameliyathanedeler\.",\s*english:\s*"The doctors have been in the operating room for three hours\."/,
    'libraryData.ts s90 must use "The doctors"'
  );
});

test('Modal-11 and Modal-12 s90 swapped sentences fix', () => {
  const allSentences = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/data/json/all_sentences.json'), 'utf8')
  );
  const m11_s90 = allSentences['modal-11']?.find((s) => s.id === 's90');
  assert.ok(m11_s90, 'modal-11 s90 must exist');
  assert.equal(
    m11_s90.turkish,
    'Ona gerçeği söylesem mi yoksa bir süre beklesem mi?',
    'modal-11 s90 turkish must match Had I better'
  );
  assert.equal(
    m11_s90.english,
    'Had I better tell him the truth or wait for a while?'
  );

  const m12_s90 = allSentences['modal-12']?.find((s) => s.id === 's90');
  assert.ok(m12_s90, 'modal-12 s90 must exist');
  assert.equal(
    m12_s90.turkish,
    'Yarın erken kalkmanız gerekiyor mu?',
    'modal-12 s90 turkish must match Do you need to get up early tomorrow?'
  );
  assert.equal(
    m12_s90.english,
    'Do you need to get up early tomorrow?'
  );

  const libraryContent = fs.readFileSync(path.join(rootDir, 'src/data/libraryData.ts'), 'utf8');
  assert.match(
    libraryContent,
    /id:\s*"s90",\s*turkish:\s*"Ona gerçeği söylesem mi yoksa bir süre beklesem mi\?",\s*english:\s*"Had I better tell him the truth or wait for a while\?"/
  );
  assert.match(
    libraryContent,
    /id:\s*"s90",\s*turkish:\s*"Yarın erken kalkmanız gerekiyor mu\?",\s*english:\s*"Do you need to get up early tomorrow\?"/
  );
});

test('Sentence aux-8 s9 "since all night" OCR fix to "since last night"', () => {
  const allSentences = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/data/json/all_sentences.json'), 'utf8')
  );
  const s9 = allSentences['aux-8']?.find((s) => s.id === 's9');
  assert.ok(s9, 'aux-8 s9 must exist');
  assert.equal(
    s9.turkish,
    'Bebeğim dün geceden beri uyudu / uyumuş(tur).',
    'aux-8 s9 turkish must be "dün geceden beri"'
  );
  assert.equal(
    s9.english,
    'My baby has slept since last night.',
    'aux-8 s9 english must be "My baby has slept since last night."'
  );

  const libraryContent = fs.readFileSync(path.join(rootDir, 'src/data/libraryData.ts'), 'utf8');
  assert.match(
    libraryContent,
    /id:\s*"s9",\s*turkish:\s*"Bebeğim dün geceden beri uyudu \/ uyumuş\(tur\)\.",\s*english:\s*"My baby has slept since last night\."/
  );
});

test('Sentence modal-5 s22 "so! can\'t" fix to "so I can\'t" and Turkish OCR cleanup', () => {
  const allSentences = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/data/json/all_sentences.json'), 'utf8')
  );
  const s22 = allSentences['modal-5']?.find((s) => s.id === 's22');
  assert.ok(s22, 'modal-5 s22 must exist in all_sentences.json');
  assert.equal(
    s22.english,
    "When I was six, I could play violin but I haven't practiced since then so I can't play anymore.",
    'modal-5 s22 english must have "so I can\'t" instead of "so! can\'t"'
  );
  assert.equal(
    s22.turkish,
    'Altı yaşımdayken keman çalabiliyordum ama o zamandan beri pratik yapmadığım için artık çalamıyorum.',
    'modal-5 s22 turkish OCR errors must be fixed'
  );

  const libraryContent = fs.readFileSync(path.join(rootDir, 'src/data/libraryData.ts'), 'utf8');
  assert.match(
    libraryContent,
    /id:\s*"s22",\s*turkish:\s*"Altı yaşımdayken keman çalabiliyordum ama o zamandan beri pratik yapmadığım için artık çalamıyorum\.",\s*english:\s*"When I was six, I could play violin but I haven't practiced since then so I can't play anymore\."/
  );
});

test('Sentence aux-12 s65 Turkish OCR fix "kalacaoim" -> "kalacağını"', () => {
  const allSentences = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/data/json/all_sentences.json'), 'utf8')
  );
  const s65 = allSentences['aux-12']?.find((s) => s.id === 's65');
  assert.ok(s65, 'aux-12 s65 must exist in all_sentences.json');
  assert.equal(
    s65.turkish,
    'Konferansa geç kalacağını biliyor ama gelmeden önce sona ermeyeceğini umuyor.',
    'aux-12 s65 turkish OCR error must be fixed'
  );
  assert.equal(
    s65.english,
    "He knows he'll be late for the conference but he hopes it will not have ended before he arrives."
  );

  const libraryContent = fs.readFileSync(path.join(rootDir, 'src/data/libraryData.ts'), 'utf8');
  assert.match(
    libraryContent,
    /id:\s*"s65",\s*turkish:\s*"Konferansa geç kalacağını biliyor ama gelmeden önce sona ermeyeceğini umuyor\.",\s*english:\s*"He knows he'll be late for the conference but he hopes it will not have ended before he arrives\."/
  );
});

test('Sentence aux-18 s72 grammatical correction "have been boil" -> "have been boiling"', () => {
  const allSentences = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/data/json/all_sentences.json'), 'utf8')
  );
  const s72 = allSentences['aux-18']?.find((s) => s.id === 's72');
  assert.ok(s72, 'aux-18 s72 must exist in all_sentences.json');
  assert.equal(
    s72.english,
    'Will the soup have been boiling too long when we get home?',
    'aux-18 s72 english should be grammatically correct ("have been boiling")'
  );

  const libraryContent = fs.readFileSync(path.join(rootDir, 'src/data/libraryData.ts'), 'utf8');
  assert.match(
    libraryContent,
    /id:\s*"s72",\s*turkish:\s*"Eve gittiğimizde, çorba çok uzun süre kaynıyor olacak mı\?",\s*english:\s*"Will the soup have been boiling too long when we get home\?"/
  );
});


