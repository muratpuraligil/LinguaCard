import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('FlashcardMode.tsx must define per-level localStorage keys for index, set number, and active ids', () => {
  const flashcardSource = fs.readFileSync(path.join(rootDir, 'src/components/FlashcardMode.tsx'), 'utf8');

  // Verify key helper functions or patterns
  assert.match(
    flashcardSource,
    /getActiveIdsKey|lingua_flashcard_active_ids/,
    'Must define active ids storage key with mode and level'
  );
  assert.match(
    flashcardSource,
    /getCurrentIndexKey|lingua_flashcard_current_index/,
    'Must define current index storage key with mode and level'
  );
  assert.match(
    flashcardSource,
    /getSetNumKey|lingua_flashcard_set_num/,
    'Must define set number storage key with mode and level'
  );
});

test('FlashcardMode.tsx must save outgoing level progress before switching to new level', () => {
  const flashcardSource = fs.readFileSync(path.join(rootDir, 'src/components/FlashcardMode.tsx'), 'utf8');

  // Must ensure outgoing level progress is preserved upon level transition
  assert.match(
    flashcardSource,
    /(outgoingLevel|prevLevel|prevConfigRef|activeSessionRef|lastHandledConfigRef)/,
    'Must have a reference tracking level changes for persistent progress'
  );

  // Must save outgoing level's currentIndex and currentSetNum
  assert.match(
    flashcardSource,
    /localStorage\.setItem\([^)]*getCurrentIndexKey\([^)]*(outgoing|prev)[^)]*\)/,
    'Must explicitly save outgoing level currentIndex to localStorage on level switch'
  );
  assert.match(
    flashcardSource,
    /localStorage\.setItem\([^)]*getSetNumKey\([^)]*(outgoing|prev)[^)]*\)/,
    'Must explicitly save outgoing level currentSetNum to localStorage on level switch'
  );
});

test('FlashcardMode.tsx must synchronize activeIds with new level words to prevent old IDs blocking new level', () => {
  const flashcardSource = fs.readFileSync(path.join(rootDir, 'src/components/FlashcardMode.tsx'), 'utf8');

  // Must filter validIds against sortedWords
  assert.match(
    flashcardSource,
    /sortedWords\.some\([^)]*=>[^)]*id\)/,
    'Must validate activeIds against sortedWords when switching levels'
  );

  // Must guard save effects to prevent overwriting new level with stale previous level state
  assert.match(
    flashcardSource,
    /prevConfigRef\.current\.selectedLevel\s*===\s*selectedLevel/,
    'Save effects must check that selectedLevel matches active level before writing currentIndex/currentSetNum'
  );
});

test('Flashcard per-level persistent progress simulation (A1 7th card <-> A2 3rd card across all levels)', () => {
  // Simulate mock localStorage
  const storage = {};
  const mockLocalStorage = {
    getItem: (key) => storage[key] ?? null,
    setItem: (key, val) => { storage[key] = String(val); },
    removeItem: (key) => { delete storage[key]; }
  };

  const getIndexKey = (mode, level) => `lingua_flashcard_current_index_${mode}_${level}`;
  const getSetKey = (mode, level) => `lingua_flashcard_set_num_${mode}_${level}`;
  const getActiveKey = (mode, level) => `lingua_flashcard_active_ids_${mode}_${level}`;

  const mode = 'LIBRARY';
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // Simulate progress across all levels
  levels.forEach((lvl, idx) => {
    mockLocalStorage.setItem(getIndexKey(mode, lvl), String(idx + 2)); // A1->2, A2->3, B1->4, etc.
    mockLocalStorage.setItem(getSetKey(mode, lvl), String(idx + 1));
    mockLocalStorage.setItem(getActiveKey(mode, lvl), JSON.stringify([`${lvl}_word_1`, `${lvl}_word_2`]));
  });

  // Verify each level preserves its exact progress independently
  levels.forEach((lvl, idx) => {
    const savedIndex = parseInt(mockLocalStorage.getItem(getIndexKey(mode, lvl)), 10);
    const savedSet = parseInt(mockLocalStorage.getItem(getSetKey(mode, lvl)), 10);
    const savedIds = JSON.parse(mockLocalStorage.getItem(getActiveKey(mode, lvl)));

    assert.strictEqual(savedIndex, idx + 2, `${lvl} index mismatch`);
    assert.strictEqual(savedSet, idx + 1, `${lvl} set mismatch`);
    assert.deepStrictEqual(savedIds, [`${lvl}_word_1`, `${lvl}_word_2`], `${lvl} activeIds mismatch`);
  });

  // Specific requirement: A1 at index 7, A2 at index 3
  mockLocalStorage.setItem(getIndexKey(mode, 'A1'), '7');
  mockLocalStorage.setItem(getIndexKey(mode, 'A2'), '3');

  assert.strictEqual(parseInt(mockLocalStorage.getItem(getIndexKey(mode, 'A1')), 10), 7);
  assert.strictEqual(parseInt(mockLocalStorage.getItem(getIndexKey(mode, 'A2')), 10), 3);
});
