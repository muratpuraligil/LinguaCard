import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Dashboard.tsx must have onboarding tour tooltip removed', () => {
  const dashSource = fs.readFileSync(path.join(rootDir, 'src/components/Dashboard.tsx'), 'utf8');

  assert.ok(!dashSource.includes('tourStep'), 'Dashboard.tsx must not contain tourStep state');
  assert.ok(!dashSource.includes('Kelime listeni yapıştır yada resim olarak yükle'), 'Dashboard.tsx must not render the onboarding tooltip');
});

test('QuizMode.tsx progress bar must match FlashcardMode format with SET and total words above the bar', () => {
  const quizSource = fs.readFileSync(path.join(rootDir, 'src/components/QuizMode.tsx'), 'utf8');

  // Must format SET with total words count e.g. SET {currentSetNum} / {totalSets} ({sortedWords.length})
  assert.match(
    quizSource,
    /SET\s*\{currentSetNum\}\s*\/\s*\{totalSets\}\s*\(\{sortedWords\.length\}\)/,
    'QuizMode.tsx must show SET currentSetNum / totalSets (sortedWords.length) above the bar'
  );

  // Must have both İlerleyen and SET in the header above the progress bar in a flex justify-between container
  assert.ok(
    quizSource.includes('flex justify-between items-center') && quizSource.includes('İlerleyen:'),
    'QuizMode.tsx progress bar header must have İlerleyen and SET together in a flex justify-between container'
  );
});

test('QuizMode.tsx must prevent vertical scrolling with compact viewport-fitted layout', () => {
  const quizSource = fs.readFileSync(path.join(rootDir, 'src/components/QuizMode.tsx'), 'utf8');

  // Must not have oversized mb-12 or p-12 which cause vertical overflow and scrolling
  assert.ok(!quizSource.includes('mb-12'), 'QuizMode.tsx must not have mb-12 causing viewport overflow');
  assert.ok(!quizSource.includes('p-12'), 'QuizMode.tsx must not have p-12 in question card causing viewport overflow');
  assert.ok(!quizSource.includes('min-h-[80px]'), 'QuizMode.tsx options must not have min-h-[80px] causing viewport overflow');
});
