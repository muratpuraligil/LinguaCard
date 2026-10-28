import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('LibraryPracticeScreen.tsx: isAllCompleted must check that every sentence in the current set is completed', () => {
  const filePath = path.join(rootDir, 'src', 'components', 'LibraryPracticeScreen.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Should not use fragile Object.keys(completed).length === set.sentences.length
  assert.ok(
    content.includes('set.sentences.every') || content.includes('s => !!completed[s.id]'),
    'LibraryPracticeScreen must verify that every sentence in current set is in completed object'
  );
});

test('LibraryPracticeScreen.tsx: Finished popup must have a dismiss/close button and clear state on regenerate', () => {
  const filePath = path.join(rootDir, 'src', 'components', 'LibraryPracticeScreen.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Must have a close button in finished popup
  assert.ok(
    content.includes('setShowFinishedModal(false)') && content.includes('title="Kapat"'),
    'Finished modal must have a dismiss/close button so users are not trapped'
  );

  // onRegenerate must clear local completed/inputs state
  assert.ok(
    content.includes('setCompleted({})') && content.includes('onRegenerate'),
    'onRegenerate click handler must clear completed state'
  );
});

test('App.tsx: handleRandomLibrarySet must clean up completed storage on forceNew and auto-refresh finished mix', () => {
  const filePath = path.join(rootDir, 'src', 'App.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Check storage cleanup for random-mix on forceNew
  assert.ok(
    content.includes('library_completed_random-mix_'),
    'handleRandomLibrarySet must clean up random-mix storage keys when generating a new set'
  );

  // Check smooth onGoHome navigation without full window.location.reload
  assert.ok(
    content.includes('onGoHome={() => setMode(AppMode.HOME)}'),
    'onGoHome must smoothly change mode to HOME instead of forcing window.location.reload'
  );
});
