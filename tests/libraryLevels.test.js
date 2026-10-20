import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const REQUIRED_HEADERS = ['Kelime', 'Türkçe Anlamı', 'Türü', 'Kategori'];

test('docs directory must contain A2-1000.xlsx, B1-1000.xlsx, and B2-1000.xlsx with valid headers and >=1000 rows', () => {
  const levels = ['A2', 'B1', 'B2'];
  for (const level of levels) {
    const filePath = path.join(rootDir, 'docs', `${level}-1000.xlsx`);
    assert.ok(fs.existsSync(filePath), `docs/${level}-1000.xlsx does not exist`);

    const wb = XLSX.readFile(filePath);
    assert.ok(wb.SheetNames.includes('Sayfa1'), `${level}-1000.xlsx missing Sayfa1 sheet`);

    const sheet = wb.Sheets['Sayfa1'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    assert.ok(rows.length >= 1001, `${level}-1000.xlsx should have at least 1000 word rows + 1 header, found ${rows.length}`);

    const header = rows[0];
    for (const req of REQUIRED_HEADERS) {
      assert.ok(header.includes(req), `${level}-1000.xlsx header missing '${req}'`);
    }
  }
});

test('src/data/json must contain a2_words.json, b1_words.json, and b2_words.json with >=1000 items', () => {
  const levels = ['a2', 'b1', 'b2'];
  for (const level of levels) {
    const jsonPath = path.join(rootDir, 'src', 'data', 'json', `${level}_words.json`);
    assert.ok(fs.existsSync(jsonPath), `${level}_words.json does not exist`);

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert.ok(Array.isArray(data), `${level}_words.json is not an array`);
    assert.ok(data.length >= 1000, `${level}_words.json should have >= 1000 words, found ${data.length}`);

    const sample = data[0];
    assert.ok(sample.id, 'word missing id');
    assert.ok(sample.english, 'word missing english');
    assert.ok(sample.turkish, 'word missing turkish');
    assert.ok(sample.category, 'word missing category');
    assert.ok(sample.word_type, 'word missing word_type');
    assert.strictEqual(sample.set_name.toUpperCase(), level.toUpperCase(), `set_name must match ${level.toUpperCase()}`);
  }
});

test('supabaseClient.ts must import and integrate A1, A2, B1, and B2 local bundles in getLibraryWords', () => {
  const clientSource = fs.readFileSync(path.join(rootDir, 'src/services/supabaseClient.ts'), 'utf8');

  assert.match(clientSource, /import\s+a1WordsData\s+from\s+['"]\.\.\/data\/json\/a1_words\.json['"]/, 'Missing a1_words.json import');
  assert.match(clientSource, /import\s+a2WordsData\s+from\s+['"]\.\.\/data\/json\/a2_words\.json['"]/, 'Missing a2_words.json import');
  assert.match(clientSource, /import\s+b1WordsData\s+from\s+['"]\.\.\/data\/json\/b1_words\.json['"]/, 'Missing b1_words.json import');
  assert.match(clientSource, /import\s+b2WordsData\s+from\s+['"]\.\.\/data\/json\/b2_words\.json['"]/, 'Missing b2_words.json import');

  assert.match(clientSource, /A2\s*:\s*a2WordsData/, 'Missing A2 bundle mapping');
  assert.match(clientSource, /B1\s*:\s*b1WordsData/, 'Missing B1 bundle mapping');
  assert.match(clientSource, /B2\s*:\s*b2WordsData/, 'Missing B2 bundle mapping');
});
