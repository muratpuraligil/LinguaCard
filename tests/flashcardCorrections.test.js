import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('A1 word "Blog" Turkish translation must be "Web günlüğü" (Blog removed)', () => {
  // Check a1_words.json
  const a1Json = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/json/a1_words.json'), 'utf8'));
  const blogItem = a1Json.find(w => w.english.toLowerCase() === 'blog');
  assert.ok(blogItem, 'Blog item not found in a1_words.json');
  assert.strictEqual(blogItem.turkish, 'Web günlüğü');

  // Check docs/A1-1000.xlsx
  const wb = XLSX.readFile(path.join(rootDir, 'docs/A1-1000.xlsx'));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  const blogRow = rows.find(r => (r['Kelime'] || '').trim().toLowerCase() === 'blog');
  assert.ok(blogRow, 'Blog row not found in docs/A1-1000.xlsx');
  assert.strictEqual(blogRow['Türkçe Anlamı'], 'Web günlüğü');
});

test('A1 word "Cell" Turkish translation must be "Hücre" ("Cep telefonu" removed)', () => {
  // Check a1_words.json
  const a1Json = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/json/a1_words.json'), 'utf8'));
  const cellItem = a1Json.find(w => w.english.toLowerCase() === 'cell');
  assert.ok(cellItem, 'Cell item not found in a1_words.json');
  assert.strictEqual(cellItem.turkish, 'Hücre');

  // Check docs/A1-1000.xlsx
  const wb = XLSX.readFile(path.join(rootDir, 'docs/A1-1000.xlsx'));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  const cellRow = rows.find(r => (r['Kelime'] || '').trim().toLowerCase() === 'cell');
  assert.ok(cellRow, 'Cell row not found in docs/A1-1000.xlsx');
  assert.strictEqual(cellRow['Türkçe Anlamı'], 'Hücre');
});

test('FlashcardMode.tsx must use deterministic stable ordering instead of Math.random shuffling', () => {
  const flashcardSource = fs.readFileSync(path.join(rootDir, 'src/components/FlashcardMode.tsx'), 'utf8');

  // Must not have Math.random() - 0.5 for shuffling card sets
  assert.equal(
    flashcardSource.includes('Math.random() - 0.5'),
    false,
    'FlashcardMode.tsx must not use Math.random() - 0.5 to shuffle sets, words must be stably ordered'
  );
});
