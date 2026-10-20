import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const flashcardFilePath = path.resolve(process.cwd(), 'src/components/FlashcardMode.tsx');
const flashcardCode = fs.readFileSync(flashcardFilePath, 'utf-8');

test('FlashcardMode: Item 1 - Progress indicator displays total word count in parentheses', () => {
    // Should render SET {currentSetNum} / {totalSets} ({totalWordsCount})
    // E.g.: SET {currentSetNum} / {totalSets} ({scopedWords.length})
    const hasTotalWordCountInSetLabel = /SET\s*\{currentSetNum\}\s*\/\s*\{totalSets\}\s*\(\{[^}]*length\}\)/i.test(flashcardCode);
    assert.ok(
        hasTotalWordCountInSetLabel,
        'Progress label must include total word count in parentheses, e.g. SET {currentSetNum} / {totalSets} ({scopedWords.length})'
    );
});

test('FlashcardMode: Item 2 - Level tabs and mode buttons are centered relative to each other', () => {
    // The middle column container must use items-center so level tabs are centered under the top mode buttons
    assert.match(
        flashcardCode,
        /<div className="[^"]*flex flex-col items-center[^"]*justify-self-center/,
        'Center column must use items-center so level tabs are centered under top buttons rather than left-aligned'
    );

    // Level tabs container should also have justify-center
    assert.match(
        flashcardCode,
        /flex items-center justify-center gap-1[^>]*>[\s\S]*?LEVELS\.map/,
        'Level tabs container must have justify-center for balanced spacing'
    );
});

test('FlashcardMode: Item 3 - Library Word Scope ("Temel 300" vs "Tümü")', () => {
    // 1. Must define libraryScope or equivalent state defaulting to CORE_300
    assert.match(
        flashcardCode,
        /libraryScope|wordScope/i,
        'FlashcardMode must declare a libraryScope state'
    );

    // 2. Must persist in localStorage
    assert.match(
        flashcardCode,
        /localStorage\.(get|set)Item\(['"`]lingua_flashcard_library_scope['"`]/,
        'FlashcardMode must persist library scope preference in localStorage'
    );

    // 3. Must slice first 300 words when in CORE_300 mode
    assert.match(
        flashcardCode,
        /\.slice\(0,\s*300\)/,
        'FlashcardMode must slice the first 300 words when in CORE_300 mode'
    );

    // 4. Must render UI controls for "Temel 300" and "Tümü"
    assert.match(
        flashcardCode,
        /Temel 300/,
        'FlashcardMode must render a "Temel 300" button/toggle'
    );
    assert.match(
        flashcardCode,
        /Tümü/,
        'FlashcardMode must render a "Tümü" button/toggle'
    );
});
