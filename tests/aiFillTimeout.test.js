import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('geminiService.ts must use active models instead of retired gemini-2.0-flash / gemini-1.5-flash', () => {
  const source = fs.readFileSync(path.join(rootDir, 'src/services/geminiService.ts'), 'utf8');

  // Must not have only retired models
  const hasOnlyRetired = !source.includes('gemini-2.5-flash') && !source.includes('gemini-3.8-flash') && !source.includes('gemini-flash-latest');
  assert.equal(
    hasOnlyRetired,
    false,
    'geminiService.ts must include active models (gemini-2.5-flash / gemini-3.8-flash / gemini-flash-latest)'
  );
});

test('analyzeImage.ts analyzeText must enforce a timeout on Edge Function and fall back safely', () => {
  const source = fs.readFileSync(path.join(rootDir, 'src/services/analyzeImage.ts'), 'utf8');

  // Must have a timeout or AbortSignal mechanism for Edge Function
  const hasTimeoutHandling = source.includes('AbortController') || source.includes('signal') || source.includes('timeout') || source.includes('Promise.race');
  assert.equal(
    hasTimeoutHandling,
    true,
    'analyzeText in analyzeImage.ts must have timeout/abort handling so Edge Function cannot hang indefinitely'
  );
});

test('WordList.tsx handleAiFill must have timeout protection and safety cleanup for isAiFilling', () => {
  const source = fs.readFileSync(path.join(rootDir, 'src/components/WordList.tsx'), 'utf8');

  // Check that handleAiFill has timeout or signal handling to prevent endless loading
  const handleAiFillMatch = source.match(/handleAiFill\s*=\s*async\s*\(\)\s*=>\s*\{([\s\S]*?)\n\s*\};/);
  assert.ok(handleAiFillMatch, 'handleAiFill function must exist in WordList.tsx');

  const body = handleAiFillMatch[1];
  const hasSafetyTimeoutOrController = body.includes('AbortController') || body.includes('timeout') || body.includes('safety') || body.includes('Promise.race');
  assert.equal(
    hasSafetyTimeoutOrController,
    true,
    'handleAiFill must include timeout or AbortController safety protection to prevent getting stuck in AI Analiz Ediyor'
  );
});
