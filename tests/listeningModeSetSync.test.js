import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const flashcardPath = path.resolve(process.cwd(), 'src/components/FlashcardMode.tsx');

test('FlashcardMode: handleNewSet must synchronize activeIds and localStorage with nextWords so UI card matches audio in Set 3+', () => {
    const code = fs.readFileSync(flashcardPath, 'utf8');

    // 1. handleNewSet must compute nextWords and nextIds immediately and call setActiveIds(nextIds) instead of setActiveIds([])
    assert.match(
        code,
        /const\s+handleNewSet\s*=\s*\(resumeListening:\s*boolean\s*=\s*false\)\s*=>\s*\{[\s\S]*?const\s+nextWords\s*=\s*scopedWords\.slice\(nextSetStart,\s*nextSetStart\s*\+\s*FLASHCARD_SET_SIZE\);[\s\S]*?const\s+nextIds\s*=\s*nextWords\.map\(w\s*=>\s*w\.id\);[\s\S]*?setActiveIds\(nextIds\);/,
        'handleNewSet must immediately set activeIds to nextIds of the new set instead of empty array []'
    );

    // 2. currentSet useMemo must ensure LIBRARY mode always returns the slice for currentSetNum
    assert.match(
        code,
        /const\s+currentSet\s*=\s*useMemo\(\(\)\s*=>\s*\{[\s\S]*?if\s*\(\s*studyMode\s*===\s*'LIBRARY'\s*\)\s*\{\s*return\s+setSlice;\s*\}/,
        'currentSet must always return the currentSetNum slice in LIBRARY mode so stale activeIds can never show old set cards'
    );

    // 3. useEffect must validate that activeIds in LIBRARY mode belong to currentSetNum's setWords
    assert.match(
        code,
        /setChanged[\s\S]*?setWords\.some\(w\s*=>\s*w\.id\s*===\s*id\)/,
        'useEffect must validate activeIds against currentSetNum setWords so legacy/previous set IDs are not reused'
    );
});
