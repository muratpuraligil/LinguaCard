import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('QuizMode.tsx finish screen is compact and prevents scroll', () => {
  const quizModePath = path.resolve('src/components/QuizMode.tsx');
  const code = fs.readFileSync(quizModePath, 'utf8');

  // Should not use oversized padding, fonts or buttons in finished view
  assert.strictEqual(code.includes('p-10 rounded-[56px]'), false, 'Finished card should not use p-10 rounded-[56px]');
  assert.strictEqual(code.includes('w-20 h-20 mx-auto mb-6 animate-bounce'), false, 'CheckCircle icon should not be w-20 h-20 mb-6');
  assert.strictEqual(code.includes('text-7xl font-black text-emerald-500 tracking-tighter'), false, 'Score should not be oversized text-7xl');
  assert.strictEqual(code.includes('text-4xl font-black text-white mb-2'), false, 'Finish heading should not be text-4xl mb-2');
  assert.strictEqual(code.includes('py-4 rounded-3xl font-black text-base'), false, 'Buttons should not be oversized py-4 rounded-3xl text-base');
});

test('FlashcardMode.tsx finish screen is compact', () => {
  const flashcardModePath = path.resolve('src/components/FlashcardMode.tsx');
  const code = fs.readFileSync(flashcardModePath, 'utf8');

  assert.strictEqual(code.includes('p-12 rounded-[56px]'), false, 'Finished card should not use p-12 rounded-[56px]');
  assert.strictEqual(code.includes('size={72} className="text-yellow-500 mx-auto mb-6 animate-bounce"'), false, 'Trophy icon should not be size={72} mb-6');
});
