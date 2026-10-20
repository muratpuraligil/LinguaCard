import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const levels = ['A2', 'B1', 'B2'];

for (const level of levels) {
  const exportPath = path.join(rootDir, 'scripts', 'word_data', `${level.toLowerCase()}_export.json`);
  const excelPath = path.join(rootDir, 'docs', `${level}-1000.xlsx`);
  const jsonPath = path.join(rootDir, 'src', 'data', 'json', `${level.toLowerCase()}_words.json`);

  const rawWords = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  console.log(`Processing ${level}: ${rawWords.length} words...`);

  // 1. Prepare Excel data
  // Headers: ['Kelime', 'Türkçe Anlamı', 'Türü', 'Kategori']
  const excelRows = [
    ['Kelime', 'Türkçe Anlamı', 'Türü', 'Kategori'],
    ...rawWords.map(w => [w[0], w[1], w[2], w[3]])
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(excelRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sayfa1');
  XLSX.writeFile(wb, excelPath);
  console.log(`✅ Saved ${excelPath} with ${excelRows.length} rows (including header)`);

  // 2. Prepare JSON data
  const jsonWords = rawWords.map((w, index) => ({
    id: `${level.toLowerCase()}-lib-${index + 1}`,
    english: w[0],
    turkish: w[1],
    example_sentence: '',
    turkish_sentence: '',
    word_type: w[2],
    category: w[3],
    set_name: level.toUpperCase(),
    user_id: null,
    created_at: new Date('2026-10-20T12:00:00.000Z').toISOString()
  }));

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(jsonWords, null, 2), 'utf8');
  console.log(`✅ Saved ${jsonPath} with ${jsonWords.length} items`);
}

console.log("All levels successfully generated!");
