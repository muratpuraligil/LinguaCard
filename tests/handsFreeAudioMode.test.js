import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('AudioStudyService module and core contracts exist', async () => {
    const servicePath = path.resolve('src/services/audioStudyService.ts');
    assert.ok(fs.existsSync(servicePath), 'src/services/audioStudyService.ts must exist');

    const content = fs.readFileSync(servicePath, 'utf8');
    assert.match(content, /export class AudioStudyService|export const audioStudyService/, 'Must export AudioStudyService');
    assert.match(content, /startListeningSession/, 'Must have startListeningSession method');
    assert.match(content, /stop|cleanup/, 'Must have stop or cleanup method');
    assert.match(content, /pause/, 'Must have pause method');
    assert.match(content, /resume/, 'Must have resume method');
    assert.match(content, /mediaSession/i, 'Must integrate with navigator.mediaSession');
});

test('FlashcardMode.tsx integrates Hands-free Audio Mode', async () => {
    const flashcardPath = path.resolve('src/components/FlashcardMode.tsx');
    const content = fs.readFileSync(flashcardPath, 'utf8');

    assert.match(content, /Dinleme Modu|audioStudyService|ListeningMode/i, 'FlashcardMode.tsx must include Dinleme Modu');
    assert.match(content, /ListeningModeBar|audioStudy/i, 'FlashcardMode.tsx must integrate ListeningModeBar or audio controls');
});

test('ListeningModeBar.tsx component exists with play/pause and delay controls', async () => {
    const barPath = path.resolve('src/components/ListeningModeBar.tsx');
    assert.ok(fs.existsSync(barPath), 'src/components/ListeningModeBar.tsx must exist');

    const content = fs.readFileSync(barPath, 'utf8');
    assert.match(content, /play|pause/i, 'ListeningModeBar must have play/pause controls');
    assert.match(content, /Önceki|Sonraki|Chevron|Skip/i, 'ListeningModeBar must have navigation buttons');
});

test('FlashcardMode and audioStudyService keep yellow back card visible and prevent next translation leak', async () => {
    const flashcardPath = path.resolve('src/components/FlashcardMode.tsx');
    const flashcardContent = fs.readFileSync(flashcardPath, 'utf8');

    // In FlashcardMode.tsx onWordChange, phase 'back' must set isFlipped to true without resetting via setCurrentIndex
    assert.match(
        flashcardContent,
        /phase\s*===\s*'front'[\s\S]*?setCurrentIndex\(idx\)[\s\S]*?setIsFlipped\(false\)/,
        'FlashcardMode.tsx must only update currentIndex on front phase'
    );
    assert.match(
        flashcardContent,
        /phase\s*===\s*'back'[\s\S]*?setIsFlipped\(true\)/,
        'FlashcardMode.tsx must set isFlipped(true) on back phase so yellow card displays clearly'
    );
    assert.match(
        flashcardContent,
        /phase\s*===\s*'transition'[\s\S]*?setIsFlipped\(false\)/,
        'FlashcardMode.tsx must set isFlipped(false) on transition phase before advancing word'
    );

    const servicePath = path.resolve('src/services/audioStudyService.ts');
    const serviceContent = fs.readFileSync(servicePath, 'utf8');

    // In audioStudyService.ts, translation must remain visible with reading pause before transition and advance
    assert.match(
        serviceContent,
        /transition/,
        'audioStudyService.ts must handle transition phase'
    );
    assert.match(
        serviceContent,
        /advanceToNext/,
        'audioStudyService.ts must have advanceToNext after flip animation delay'
    );
    assert.match(
        serviceContent,
        /if\s*\(\s*this\.currentPhase\s*===\s*'back'\s*\)/,
        'audioStudyService.ts next/prev must check if card is flipped back and flip to front first'
    );

    // In FlashcardMode.tsx, handleAudioNext and handleAudioPrev must flip card first if flipped
    assert.match(
        flashcardContent,
        /handleAudioNext\s*=\s*\(\)\s*=>\s*\{[\s\S]*?if\s*\(\s*isFlipped\s*\)[\s\S]*?setIsFlipped\(false\)/,
        'FlashcardMode.tsx handleAudioNext must flip card front first if isFlipped is true'
    );
});


