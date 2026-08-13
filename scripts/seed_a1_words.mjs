import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelPath = path.resolve(__dirname, '../docs/A1-1000.xlsx');

const supabaseUrl = 'https://xxjfrsbcygpcksndjrzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4amZyc2JjeWdwY2tzbmRqcnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTc1NDQsImV4cCI6MjA4MTgzMzU0NH0.j8sFVCH1A_hbrDOMEAUHPn5-0seRK6ZtxS2KQXxRaho';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedA1Words() {
  console.log(`Reading excel file from: ${excelPath}`);
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  console.log(`Found ${rows.length} rows in ${sheetName}. Preparing data...`);

  const wordsToInsert = rows.map(row => {
    const wordEn = (row['Kelime'] || row['word_en'] || '').toString().trim();
    const wordTr = (row['Türkçe Anlamı'] || row['word_tr'] || '').toString().trim();
    const wordType = (row['Türü'] || row['word_type'] || '').toString().trim();
    const category = (row['Kategori'] || row['category'] || '').toString().trim();

    return {
      word_en: wordEn,
      word_tr: wordTr,
      word_type: wordType || null,
      category: category || null,
      set_name: 'A1',
      user_id: null,
      example_sentence_en: '',
      example_sentence_tr: ''
    };
  }).filter(item => item.word_en && item.word_tr);

  console.log(`Filtered ${wordsToInsert.length} valid words for insertion.`);

  const { data: existing, error: fetchErr } = await supabase
    .from('words')
    .select('id, word_en')
    .eq('set_name', 'A1')
    .is('user_id', null);

  if (fetchErr) {
    console.error('Error checking existing A1 words:', fetchErr.message);
  }

  const existingMap = new Set((existing || []).map(w => w.word_en.toLowerCase()));
  const newWords = wordsToInsert.filter(w => !existingMap.has(w.word_en.toLowerCase()));

  console.log(`Found ${existingMap.size} existing A1 words. ${newWords.length} new words to insert.`);

  if (newWords.length === 0) {
    console.log('No new A1 words to insert. Seeding complete!');
    return;
  }

  const BATCH_SIZE = 100;
  let insertedCount = 0;
  let hasCategoryColumn = true;

  for (let i = 0; i < newWords.length; i += BATCH_SIZE) {
    const rawBatch = newWords.slice(i, i + BATCH_SIZE);
    
    let batch = rawBatch.map(item => {
      if (!hasCategoryColumn) {
        const { category, word_type, ...rest } = item;
        return rest;
      }
      return item;
    });

    let { data, error } = await supabase
      .from('words')
      .insert(batch)
      .select();

    if (error && (error.message.includes('category') || error.message.includes('word_type'))) {
      console.warn("category/word_type columns not found in DB schema. Falling back without these columns...");
      hasCategoryColumn = false;
      batch = rawBatch.map(item => {
        const { category, word_type, ...rest } = item;
        return rest;
      });
      const retry = await supabase.from('words').insert(batch).select();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message);
    } else {
      insertedCount += (data ? data.length : batch.length);
      console.log(`Inserted batch ${i / BATCH_SIZE + 1} (${insertedCount}/${newWords.length})`);
    }
  }

  console.log(`✅ A1 Word Seeding completed! Total inserted: ${insertedCount}`);
}

seedA1Words().catch(console.error);
