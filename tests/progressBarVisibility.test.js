import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const flashcardPath = path.resolve(process.cwd(), 'src/components/FlashcardMode.tsx');
const quizPath = path.resolve(process.cwd(), 'src/components/QuizMode.tsx');

test('FlashcardMode and QuizMode progress bar track must have visible contrast and not blend into app background', () => {
    const flashcardCode = fs.readFileSync(flashcardPath, 'utf8');
    const quizCode = fs.readFileSync(quizPath, 'utf8');

    // Neither should have the invisible bg-zinc-950 track that matches the black background
    assert.strictEqual(
        flashcardCode.includes('w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5'),
        false,
        'FlashcardMode progress bar track should not be invisible bg-zinc-950'
    );
    assert.strictEqual(
        quizCode.includes('w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5'),
        false,
        'QuizMode progress bar track should not be invisible bg-zinc-950'
    );

    // Both should use a distinct contrast background such as bg-zinc-800 with clear border
    assert.match(
        flashcardCode,
        /progress\s+bar[\s\S]*?bg-zinc-800[\s\S]*?border-zinc-700/i,
        'FlashcardMode progress bar track should have distinct contrast (bg-zinc-800 border-zinc-700)'
    );
    assert.match(
        quizCode,
        /bg-zinc-800[\s\S]*?border-zinc-700/i,
        'QuizMode progress bar track should have distinct contrast (bg-zinc-800 border-zinc-700)'
    );
});
