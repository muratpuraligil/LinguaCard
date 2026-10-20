import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('supabaseClient.ts must export getLocalLibraryWords for synchronous instant tab loading', () => {
  const clientSource = fs.readFileSync(path.join(rootDir, 'src/services/supabaseClient.ts'), 'utf8');

  assert.match(clientSource, /getLocalLibraryWords\s*\(/, 'Missing getLocalLibraryWords method on wordService');
});

test('App.tsx must synchronously load local library words on level change to prevent empty modal flicker', () => {
  const appSource = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');

  assert.match(appSource, /getLocalLibraryWords/, 'App.tsx must call wordService.getLocalLibraryWords on level change');
  assert.match(appSource, /isLoading={/, 'App.tsx must pass isLoading state to FlashcardMode');
});

test('FlashcardMode.tsx must have isLoading prop and guard against showing empty state modal during transition', () => {
  const flashcardSource = fs.readFileSync(path.join(rootDir, 'src/components/FlashcardMode.tsx'), 'utf8');

  assert.match(flashcardSource, /isLoading\?:?\s*boolean/, 'FlashcardModeProps must include isLoading prop');
  assert.match(flashcardSource, /isLoading\b/, 'FlashcardMode must check isLoading');
  assert.match(flashcardSource, /isLevelLoading/, 'FlashcardMode must guard empty state with isLevelLoading check');
});
