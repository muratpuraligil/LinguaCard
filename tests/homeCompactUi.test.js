import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Dashboard.tsx has compact UI dimensions for Header, Banner, and Module cards', () => {
  const dashboardPath = path.resolve('src/components/Dashboard.tsx');
  const code = fs.readFileSync(dashboardPath, 'utf8');

  // Header should not use oversized w-16 h-16 or w-14 h-14
  assert.strictEqual(code.includes('w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl'), false, 'Header logo should be more compact than w-16 h-16 rounded-2xl');
  assert.strictEqual(code.includes('w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl'), false, 'Avatar button should be more compact than w-14 h-14');
  
  // Banner buttons should be compact (not py-4 px-6)
  assert.strictEqual(code.includes('px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-3 hover:bg-blue-600'), false, 'Banner upload button should not be oversized py-4');

  // Module cards should use compact padding and smaller rounded-2xl
  assert.strictEqual(code.includes('className="rounded-[32px] border-b-4 border-yellow-500 bg-zinc-900/80"'), false, 'Module card should use compact border-radius');
  assert.strictEqual(code.includes('bg-yellow-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6'), false, 'Module card icon should be more compact than w-12 h-12 mb-6');
});

test('WordList.tsx has compact search bar, quick add button, and word cards', () => {
  const wordListPath = path.resolve('src/components/WordList.tsx');
  const code = fs.readFileSync(wordListPath, 'utf8');

  // Search input and quick add button
  assert.strictEqual(code.includes('w-full pl-14 pr-12 py-4 bg-zinc-900 border border-white/10 rounded-2xl'), false, 'Search input should be compact (not py-4 rounded-2xl)');
  assert.strictEqual(code.includes('flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base transition-all'), false, 'Quick add button should be compact (not py-4 rounded-2xl)');

  // Word cards
  assert.strictEqual(code.includes('className="bg-zinc-800 p-6 rounded-[32px] border-b-4 border-slate-700'), false, 'Word card should not use p-6 rounded-[32px]');
  assert.strictEqual(code.includes('min-h-[90px]'), false, 'Sentence container should not be oversized min-h-[90px]');
});
