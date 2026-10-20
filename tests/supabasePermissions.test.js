import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('SUPABASE_SETUP.sql must include explicit GRANT statements for October 30 Data API exposure rule', () => {
  const sqlPath = path.join(rootDir, 'database/SUPABASE_SETUP.sql');
  assert.ok(fs.existsSync(sqlPath), 'database/SUPABASE_SETUP.sql must exist');

  const content = fs.readFileSync(sqlPath, 'utf8');

  // Verify 'words' grants
  assert.match(content, /GRANT\s+.*?\s+ON\s+(public\.)?words\s+TO\s+anon/i, 'Must grant permissions on words to anon');
  assert.match(content, /GRANT\s+.*?\s+ON\s+(public\.)?words\s+TO\s+authenticated/i, 'Must grant permissions on words to authenticated');
  assert.match(content, /GRANT\s+.*?\s+ON\s+(public\.)?words\s+TO\s+service_role/i, 'Must grant permissions on words to service_role');

  // Verify 'user_progress' grants
  assert.match(content, /GRANT\s+.*?\s+ON\s+(public\.)?user_progress\s+TO\s+authenticated/i, 'Must grant permissions on user_progress to authenticated');
  assert.match(content, /GRANT\s+.*?\s+ON\s+(public\.)?user_progress\s+TO\s+service_role/i, 'Must grant permissions on user_progress to service_role');
});

test('add_category_wordtype_and_user_progress.sql migration must include explicit GRANT statements', () => {
  const migrationPath = path.join(rootDir, 'database/migrations/add_category_wordtype_and_user_progress.sql');
  assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

  const content = fs.readFileSync(migrationPath, 'utf8');

  // Verify 'words' grants
  assert.match(content, /GRANT\s+.*?\s+ON\s+(public\.)?words\s+TO\s+anon/i, 'Migration must grant on words to anon');
  assert.match(content, /GRANT\s+.*?\s+ON\s+(public\.)?words\s+TO\s+authenticated/i, 'Migration must grant on words to authenticated');
  assert.match(content, /GRANT\s+.*?\s+ON\s+(public\.)?words\s+TO\s+service_role/i, 'Migration must grant on words to service_role');

  // Verify 'user_progress' grants
  assert.match(content, /GRANT\s+.*?\s+ON\s+(public\.)?user_progress\s+TO\s+authenticated/i, 'Migration must grant on user_progress to authenticated');
  assert.match(content, /GRANT\s+.*?\s+ON\s+(public\.)?user_progress\s+TO\s+service_role/i, 'Migration must grant on user_progress to service_role');
});
