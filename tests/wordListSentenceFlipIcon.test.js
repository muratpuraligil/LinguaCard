import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('WordList.tsx includes a visible rotate/flip icon in sentence example cards', () => {
  const code = fs.readFileSync(path.resolve('src/components/WordList.tsx'), 'utf8');

  // Must import rotate/transform icon
  assert.ok(
    code.includes('RefreshCw') || code.includes('RotateCw'),
    'WordList.tsx must import RefreshCw or RotateCw from lucide-react'
  );

  // Must render rotate/flip icon in the sentence flip container
  assert.match(
    code,
    /<RefreshCw|<RotateCw/,
    'WordList.tsx must render RefreshCw or RotateCw in sentence example'
  );

  // Must have clear affordance and tooltip/title for flipping
  assert.ok(
    code.includes('rotate-180') || code.includes('group-hover/sentence:rotate'),
    'WordList.tsx must include interactive rotation transition on hover'
  );
});
