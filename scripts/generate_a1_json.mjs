import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelPath = path.resolve(__dirname, '../docs/A1-1000.xlsx');
const jsonPath = path.resolve(__dirname, '../src/data/json/a1_words.json');

console.log(`Reading excel file: ${excelPath}`);
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

const formattedWords = rows.map((row, index) => {
  const wordEn = (row['Kelime'] || row['word_en'] || '').toString().trim();
  const wordTr = (row['Türkçe Anlamı'] || row['word_tr'] || '').toString().trim();
  const wordType = (row['Türü'] || row['word_type'] || '').toString().trim();
  const category = (row['Kategori'] || row['category'] || '').toString().trim();

  return {
    id: `a1-lib-${index + 1}`,
    english: wordEn,
    turkish: wordTr,
    example_sentence: '',
    turkish_sentence: '',
    word_type: wordType,
    category: category,
    set_name: 'A1',
    user_id: null,
    created_at: new Date().toISOString()
  };
}).filter(w => w.english && w.turkish);

fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, JSON.stringify(formattedWords, null, 2));

console.log(`Generated ${formattedWords.length} words in ${jsonPath}`);
