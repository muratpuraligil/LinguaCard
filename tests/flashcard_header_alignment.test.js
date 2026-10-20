import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('FlashcardMode.tsx header centers mode buttons and level tabs relative to each other', () => {
    const flashcardFilePath = path.resolve(process.cwd(), 'src/components/FlashcardMode.tsx');
    const content = fs.readFileSync(flashcardFilePath, 'utf-8');

    // 1. Grid with equal side columns to center the middle column
    assert.match(
        content,
        /grid\s+grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/,
        'Header must use balanced 3-column grid (minmax(0,1fr) auto minmax(0,1fr)) so middle column is centered'
    );

    // 2. Center container grouping both mode buttons and level tabs with items-center
    assert.match(
        content,
        /<div className="[^"]*flex flex-col items-center[^"]*justify-self-center/,
        'Middle column container must use items-center to center top mode buttons and level tabs relative to each other'
    );

    // 3. Level tabs must be nested inside the same center column, maintaining centered alignment
    const centerBlockMatch = content.match(
        /justify-self-center[\s\S]*?handleToggleListeningMode[\s\S]*?LEVELS\.map/
    );
    assert.ok(
        centerBlockMatch,
        'Both Listening Mode button and LEVELS.map must be inside the same center column container'
    );
});
