import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('QuizMode.tsx finish popup button layout and challenge CTA updates', () => {
  const quizModePath = path.resolve('src/components/QuizMode.tsx');
  const code = fs.readFileSync(quizModePath, 'utf8');

  const finishedBlockMatch = code.match(/if\s*\(\s*finished\s*\)\s*\{([\s\S]*?)(?:return\s*\(\s*<div[\s\S]*?)(?:\{\/\*\s*Yanlışlar Modalı)/);
  assert.ok(finishedBlockMatch, 'Must find finish block in QuizMode.tsx');
  const finishedBlock = finishedBlockMatch[0];

  // 1. "Mod Seç / Değiştir" button should be removed from the finish popup
  assert.strictEqual(
    finishedBlock.includes('Mod Seç / Değiştir'),
    false,
    'Finish popup must not contain "Mod Seç / Değiştir" button'
  );

  // 2. Must contain "Arkadaşlarını Challenge'a Davet Et"
  assert.ok(
    finishedBlock.includes("Arkadaşlarını Challenge'a Davet Et"),
    'Finish popup must contain "Arkadaşlarını Challenge\'a Davet Et"'
  );

  // 3. Challenge button must be in 1st place before "Yeni Set ile Devam Et"
  const challengeBtnIdx = finishedBlock.indexOf("Arkadaşlarını Challenge'a Davet Et");
  const newSetBtnIdx = finishedBlock.indexOf("Yeni Set ile Devam Et");
  assert.ok(challengeBtnIdx !== -1, 'Challenge button must exist');
  assert.ok(newSetBtnIdx !== -1, 'New set button must exist');
  assert.ok(
    challengeBtnIdx < newSetBtnIdx,
    'Challenge button must appear in 1st place before "Yeni Set ile Devam Et"'
  );

  // 4. Must use challenge icon (Swords)
  assert.ok(
    finishedBlock.includes('Swords'),
    'Challenge button must use Swords icon'
  );
});
