import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('QuizMode.tsx safely cleans up answerTimerRef on unmount to prevent memory leaks', () => {
  const quizModePath = path.resolve('src/components/QuizMode.tsx');
  const code = fs.readFileSync(quizModePath, 'utf8');

  assert.ok(code.includes('answerTimerRef = useRef'), 'QuizMode must define answerTimerRef');
  assert.ok(code.includes('clearTimeout(answerTimerRef.current)'), 'QuizMode must clean up answerTimerRef on unmount');
});

test('QuizShareModal and QuizChallengeResultModal do not contain console.error leak', () => {
  const shareModalPath = path.resolve('src/components/QuizShareModal.tsx');
  const resultModalPath = path.resolve('src/components/QuizChallengeResultModal.tsx');

  const shareCode = fs.readFileSync(shareModalPath, 'utf8');
  const resultCode = fs.readFileSync(resultModalPath, 'utf8');

  assert.strictEqual(shareCode.includes('console.error'), false, 'QuizShareModal must not contain console.error');
  assert.strictEqual(resultCode.includes('console.error'), false, 'QuizChallengeResultModal must not contain console.error');
});
