import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('FlashcardModeSelectionModal must order mode cards: 1. Kütüphaneden Çalış, 2. Listendeki Kelimelerle Çalış, 3. Yeni Kelimelerle Çalış', () => {
  const modalSource = fs.readFileSync(path.join(rootDir, 'src/components/FlashcardModeSelectionModal.tsx'), 'utf8');

  const libraryIdx = modalSource.indexOf('Kütüphaneden Çalış');
  const userWordsIdx = modalSource.indexOf('Listendeki Kelimelerle Çalış');
  const aiAddIdx = modalSource.indexOf('Yeni Kelimelerle Çalış');

  assert.ok(libraryIdx !== -1, 'Kütüphaneden Çalış must be in modal');
  assert.ok(userWordsIdx !== -1, 'Listendeki Kelimelerle Çalış must be in modal');
  assert.ok(aiAddIdx !== -1, 'Yeni Kelimelerle Çalış must be in modal');

  assert.ok(libraryIdx < userWordsIdx, '1. Kütüphaneden Çalış must appear before 2. Listendeki Kelimelerle Çalış');
  assert.ok(userWordsIdx < aiAddIdx, '2. Listendeki Kelimelerle Çalış must appear before 3. Yeni Kelimelerle Çalış');
});
