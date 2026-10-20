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
