import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('SentenceModeSelectionModal must order mode cards aligned with Flashcards: 1. Kütüphaneden Çalış, 2. Listendeki Kelimelerle Çalış, 3. Yeni Cümlelerle Çalış', () => {
  const modalSource = fs.readFileSync(path.join(rootDir, 'src/components/SentenceModeSelectionModal.tsx'), 'utf8');

  const libraryIdx = modalSource.indexOf('Kütüphaneden Çalış');
  const userWordsIdx = modalSource.indexOf('Listendeki Kelimelerle Çalış');
  const customSentencesIdx = modalSource.indexOf('Yeni Cümlelerle Çalış');

  assert.ok(libraryIdx !== -1, 'Kütüphaneden Çalış must be in SentenceModeSelectionModal');
  assert.ok(userWordsIdx !== -1, 'Listendeki Kelimelerle Çalış must be in SentenceModeSelectionModal');
  assert.ok(customSentencesIdx !== -1, 'Yeni Cümlelerle Çalış must be in SentenceModeSelectionModal');

  assert.ok(libraryIdx < userWordsIdx, '1. Kütüphaneden Çalış must appear before 2. Listendeki Kelimelerle Çalış');
  assert.ok(userWordsIdx < customSentencesIdx, '2. Listendeki Kelimelerle Çalış must appear before 3. Yeni Cümlelerle Çalış');
});

test('QuizModeSelectionModal must exist, include Library and User Words modes in correct order, and exclude "Yeni Kelimelerle Çalış"', () => {
  const modalPath = path.join(rootDir, 'src/components/QuizModeSelectionModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'QuizModeSelectionModal.tsx must exist');

  const modalSource = fs.readFileSync(modalPath, 'utf8');

  // Must have Kütüphane and Listendeki Kelimeler
  const libraryMatches = modalSource.match(/Kütüphaneden (?:Çöz|Çalış)/);
  const userWordsMatches = modalSource.match(/Listendeki Kelimelerle (?:Çöz|Çalış)/);

  assert.ok(libraryMatches, 'Kütüphaneden Çöz/Çalış must be present in QuizModeSelectionModal');
  assert.ok(userWordsMatches, 'Listendeki Kelimelerle Çöz/Çalış must be present in QuizModeSelectionModal');

  const libraryIdx = modalSource.indexOf(libraryMatches[0]);
  const userWordsIdx = modalSource.indexOf(userWordsMatches[0]);

  assert.ok(libraryIdx < userWordsIdx, '1. Kütüphaneden Çöz must appear before 2. Listendeki Kelimelerle Çöz');

  // Must NOT include "Yeni Kelimeler" / "Yeni Cümleler" mode
  assert.ok(!modalSource.includes('Yeni Kelimelerle'), 'QuizModeSelectionModal must NOT include "Yeni Kelimelerle" mode');
  assert.ok(!modalSource.includes('Yeni Cümlelerle'), 'QuizModeSelectionModal must NOT include "Yeni Cümlelerle" mode');
});

test('QuizMode.tsx and App.tsx must support QuizStudyMode with LIBRARY and USER_WORDS', () => {
  const appSource = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');
  assert.ok(appSource.includes('QuizModeSelectionModal'), 'App.tsx must import and use QuizModeSelectionModal');
  assert.ok(appSource.includes('showQuizSelection'), 'App.tsx must manage showQuizSelection state');

  const quizSource = fs.readFileSync(path.join(rootDir, 'src/components/QuizMode.tsx'), 'utf8');
  assert.ok(quizSource.includes('studyMode'), 'QuizMode.tsx must accept studyMode prop');
  assert.ok(quizSource.includes('LIBRARY'), 'QuizMode.tsx must handle LIBRARY study mode');
});
