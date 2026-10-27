import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('LibraryPracticeScreen.tsx cleans up timeouts and animation frames to prevent memory leaks', () => {
  const code = fs.readFileSync(path.resolve('src/components/LibraryPracticeScreen.tsx'), 'utf8');

  // Must have cleanup for textareas resize timeout
  assert.ok(code.includes('clearTimeout(resizeTimer)'), 'LibraryPracticeScreen must clean up resizeTimer in useEffect');

  // Must have cleanup for initial focus/scroll timeout
  assert.ok(code.includes('clearTimeout(initTimer)'), 'LibraryPracticeScreen must clean up initTimer in useEffect');

  // Must have cancelAnimationFrame for confetti
  assert.ok(code.includes('cancelAnimationFrame'), 'LibraryPracticeScreen must clean up confetti animation frame on unmount');
});

test('WordList.tsx cleans up sentence flip timer on unmount and click', () => {
  const code = fs.readFileSync(path.resolve('src/components/WordList.tsx'), 'utf8');

  assert.ok(code.includes('flipTimerRef'), 'WordList must define flipTimerRef to manage auto-close timer');
  assert.ok(code.includes('clearTimeout(flipTimerRef.current)'), 'WordList must clear flipTimerRef on unmount and new clicks');
});

test('App.tsx, LibraryPracticeScreen.tsx, and CustomSetStudyMode.tsx do not have unlabelled raw console.error(e)', () => {
  const appCode = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  const libCode = fs.readFileSync(path.resolve('src/components/LibraryPracticeScreen.tsx'), 'utf8');
  const customCode = fs.readFileSync(path.resolve('src/components/CustomSetStudyMode.tsx'), 'utf8');

  // Should not have isolated `console.error(e);`
  assert.strictEqual(/\bconsole\.error\(\s*e\s*\);/.test(appCode), false, 'App.tsx must not have unlabelled console.error(e);');
  assert.strictEqual(/\bconsole\.error\(\s*e\s*\);/.test(libCode), false, 'LibraryPracticeScreen.tsx must not have unlabelled console.error(e);');
  assert.strictEqual(/\bconsole\.error\(\s*e\s*\);/.test(customCode), false, 'CustomSetStudyMode.tsx must not have unlabelled console.error(e);');
});
