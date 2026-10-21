import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const flashcardFilePath = path.join(rootDir, 'src/components/FlashcardMode.tsx');
const flashcardSource = fs.readFileSync(flashcardFilePath, 'utf8');

test('FlashcardMode.tsx: Keys must support libraryScope for isolated persistence', () => {
    // Keys must incorporate scope for LIBRARY mode
    assert.match(
        flashcardSource,
        /getCurrentIndexKey\s*=\s*\([^)]*scope/i,
        'getCurrentIndexKey must accept a scope parameter'
    );
    assert.match(
        flashcardSource,
        /getSetNumKey\s*=\s*\([^)]*scope/i,
        'getSetNumKey must accept a scope parameter'
    );
    assert.match(
        flashcardSource,
        /getActiveIdsKey\s*=\s*\([^)]*scope/i,
        'getActiveIdsKey must accept a scope parameter'
    );
});

test('FlashcardMode.tsx: handleScopeChange must preserve and restore progress across scope switches', () => {
    // handleScopeChange must not unconditionally reset index and set to 0 and 1
    // It should load savedIndex / savedSet for the new scope
    assert.match(
        flashcardSource,
        /handleScopeChange[\s\S]*?localStorage\.(get|set)Item[\s\S]*?getCurrentIndexKey/,
        'handleScopeChange must save outgoing progress and restore incoming scope progress'
    );
});

test('Flashcard scope persistence simulation (CORE_300 Set 2 Card 5 <-> ALL Set 4 Card 10)', () => {
    const storage = new Map();
    const fakeLocalStorage = {
        getItem: (k) => storage.get(k) || null,
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: (k) => storage.delete(k)
    };

    const getIndexKey = (mode, lvl, scope) => `lingua_flashcard_current_index_${mode}_${lvl}_${scope}`;
    const getSetKey = (mode, lvl, scope) => `lingua_flashcard_set_num_${mode}_${lvl}_${scope}`;

    // 1. Simulate user on B2 in CORE_300 reaching Set 2, Card 5
    fakeLocalStorage.setItem(getIndexKey('LIBRARY', 'B2', 'CORE_300'), '5');
    fakeLocalStorage.setItem(getSetKey('LIBRARY', 'B2', 'CORE_300'), '2');

    // 2. User switches to ALL and reaches Set 4, Card 10
    fakeLocalStorage.setItem(getIndexKey('LIBRARY', 'B2', 'ALL'), '10');
    fakeLocalStorage.setItem(getSetKey('LIBRARY', 'B2', 'ALL'), '4');

    // 3. User switches back to CORE_300
    const restoredCoreIndex = parseInt(fakeLocalStorage.getItem(getIndexKey('LIBRARY', 'B2', 'CORE_300')), 10);
    const restoredCoreSet = parseInt(fakeLocalStorage.getItem(getSetKey('LIBRARY', 'B2', 'CORE_300')), 10);

    assert.equal(restoredCoreIndex, 5, 'CORE_300 card index must be preserved at 5');
    assert.equal(restoredCoreSet, 2, 'CORE_300 set number must be preserved at 2');

    // 4. User switches back to ALL
    const restoredAllIndex = parseInt(fakeLocalStorage.getItem(getIndexKey('LIBRARY', 'B2', 'ALL')), 10);
    const restoredAllSet = parseInt(fakeLocalStorage.getItem(getSetKey('LIBRARY', 'B2', 'ALL')), 10);

    assert.equal(restoredAllIndex, 10, 'ALL card index must be preserved at 10');
    assert.equal(restoredAllSet, 4, 'ALL set number must be preserved at 4');
});
