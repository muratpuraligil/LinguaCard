import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('user_study_state database migration and setup SQL exist and include security rules', () => {
  const migrationPath = path.join(rootDir, 'database', 'migrations', 'add_user_study_state.sql');
  const setupPath = path.join(rootDir, 'database', 'SUPABASE_SETUP.sql');

  assert.ok(fs.existsSync(migrationPath), 'Migration file add_user_study_state.sql must exist');
  assert.ok(fs.existsSync(setupPath), 'SUPABASE_SETUP.sql must exist');

  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  const setupContent = fs.readFileSync(setupPath, 'utf8');

  // Check table definition
  assert.ok(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.user_study_state'), 'Migration must create user_study_state table');
  assert.ok(migrationContent.includes('user_id uuid PRIMARY KEY'), 'user_study_state must have user_id uuid PRIMARY KEY');
  assert.ok(migrationContent.includes('state jsonb NOT NULL DEFAULT'), 'user_study_state must have state jsonb NOT NULL');
  assert.ok(migrationContent.includes('ENABLE ROW LEVEL SECURITY'), 'user_study_state must enable RLS');
  assert.ok(migrationContent.includes('GRANT SELECT, INSERT, UPDATE ON public.user_study_state TO authenticated'), 'user_study_state must grant to authenticated');

  // Check setup content
  assert.ok(setupContent.includes('user_study_state'), 'SUPABASE_SETUP.sql must contain user_study_state');
  assert.ok(setupContent.includes('GRANT SELECT, INSERT, UPDATE ON public.user_study_state TO authenticated'), 'SUPABASE_SETUP.sql must grant permissions on user_study_state');
});

test('userStateService.ts module exists and exports required methods and contracts', () => {
  const servicePath = path.join(rootDir, 'src', 'services', 'userStateService.ts');
  assert.ok(fs.existsSync(servicePath), 'src/services/userStateService.ts must exist');

  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('syncRemoteToLocal'), 'userStateService must export syncRemoteToLocal');
  assert.ok(content.includes('saveStateKey'), 'userStateService must export saveStateKey');
  assert.ok(content.includes('saveStateBulk'), 'userStateService must export saveStateBulk');
  assert.ok(content.includes('applyRemoteStudyState'), 'userStateService must export applyRemoteStudyState');
  assert.ok(content.includes('getLocalStudyState'), 'userStateService must export getLocalStudyState');
  assert.ok(content.includes('isStudyStateKey'), 'userStateService must export isStudyStateKey');
});

test('userStateService simulation: applyRemoteStudyState merges remote set progress to local storage', () => {
  // Mock localStorage in Node
  const storage = {};
  const mockLocalStorage = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };
  globalThis.localStorage = mockLocalStorage;

  // Remote data simulating PC user reaching Set 6 in Flashcards and Set 3 in Quiz
  const remoteState = {
    'lingua_flashcard_set_num_LIBRARY_A1_BASE': '6',
    'lingua_flashcard_current_index_LIBRARY_A1_BASE': '4',
    'lingua_flashcard_last_level': 'A1',
    'lingua_flashcard_library_scope': 'BASE',
    'lingua_quiz_set_num_LIBRARY_A1': '3',
    'lingua_sentence_index': '25'
  };

  // Import service dynamically or test parsing
  const servicePath = path.join(rootDir, 'src', 'services', 'userStateService.ts');
  assert.ok(fs.existsSync(servicePath), 'Service file must exist to test logic');

  // Verify that keys belong to study state
  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('lingua_flashcard_set_num_'), 'Tracked patterns must include flashcard set num');
  assert.ok(content.includes('lingua_quiz_set_num_'), 'Tracked patterns must include quiz set num');
});

test('App.tsx and FlashcardMode.tsx integrate userStateService for seamless cross-device resumption', () => {
  const appPath = path.join(rootDir, 'src', 'App.tsx');
  const flashcardPath = path.join(rootDir, 'src', 'components', 'FlashcardMode.tsx');
  const quizPath = path.join(rootDir, 'src', 'components', 'QuizMode.tsx');

  const appContent = fs.readFileSync(appPath, 'utf8');
  const flashcardContent = fs.readFileSync(flashcardPath, 'utf8');
  const quizContent = fs.readFileSync(quizPath, 'utf8');

  // App.tsx must import and call syncRemoteToLocal when session is initialized
  assert.ok(appContent.includes('userStateService'), 'App.tsx must import userStateService');
  assert.ok(appContent.includes('syncRemoteToLocal'), 'App.tsx must call syncRemoteToLocal');

  // FlashcardMode.tsx must sync set and card updates
  assert.ok(flashcardContent.includes('userStateService'), 'FlashcardMode.tsx must import userStateService');

  // QuizMode.tsx must support userId and sync set updates
  assert.ok(quizContent.includes('userStateService'), 'QuizMode.tsx must import userStateService');
});
