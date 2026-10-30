import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('libraryData.ts categories must have updated titles', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/data/libraryData.ts'), 'utf8');

  assert.ok(
    content.includes('title: "Yardımcı Fiiller (Auxiliary Verbs)"'),
    'Category 1 title must be "Yardımcı Fiiller (Auxiliary Verbs)"'
  );
  assert.ok(
    content.includes('title: "Modal Fiiller (Modal Verbs)"'),
    'Category 2 title must be "Modal Fiiller (Modal Verbs)"'
  );
});

test('SentenceMode.tsx info text must start with "Kendi listende..."', () => {
  const content = fs.readFileSync(path.join(rootDir, 'src/components/SentenceMode.tsx'), 'utf8');

  assert.ok(
    content.includes('Kendi listende yer alan kelimelere ait cümleler içermektedir.'),
    'SentenceMode.tsx must include "Kendi listende yer alan kelimelere ait cümleler içermektedir."'
  );
  assert.strictEqual(
    content.includes('<span>Kelime listesinde yer alan kelimelere ait cümleler içermektedir.</span>'),
    false,
    'Old text must be replaced'
  );
});

test('All 34 sets in libraryData and all_sentences.json must have exactly 100 sentences', () => {
  const libraryContent = fs.readFileSync(path.join(rootDir, 'src/data/libraryData.ts'), 'utf8');
  const allSentences = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/data/json/all_sentences.json'), 'utf8')
  );

  // Check all_sentences.json modal-1, modal-4, modal-6
  assert.strictEqual(allSentences['modal-1']?.length, 100, 'modal-1 must have exactly 100 sentences in all_sentences.json');
  assert.strictEqual(allSentences['modal-4']?.length, 100, 'modal-4 must have exactly 100 sentences in all_sentences.json');
  assert.strictEqual(allSentences['modal-6']?.length, 100, 'modal-6 must have exactly 100 sentences in all_sentences.json');

  // Verify all 34 sets in all_sentences.json have 100 sentences
  Object.entries(allSentences).forEach(([setId, sentences]) => {
    assert.strictEqual(sentences.length, 100, `${setId} must have exactly 100 sentences`);
  });
});
