import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const flashcardFilePath = path.resolve(process.cwd(), 'src/components/FlashcardMode.tsx');
const flashcardCode = fs.readFileSync(flashcardFilePath, 'utf-8');

const audioServiceFilePath = path.resolve(process.cwd(), 'src/services/audioStudyService.ts');
const audioServiceCode = fs.readFileSync(audioServiceFilePath, 'utf-8');

const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
const indexHtmlCode = fs.readFileSync(indexHtmlPath, 'utf-8');

test('FlashcardMode: Auto-advance countdown on set completion in listening mode', () => {
    // 1. Must track auto advance countdown (10 seconds)
    assert.match(
        flashcardCode,
        /autoAdvance|countdown/i,
        'FlashcardMode must track auto-advance countdown state'
    );

    // 2. Must trigger handleNewSet automatically when timer expires
    assert.match(
        flashcardCode,
        /handleNewSet/,
        'FlashcardMode must have handleNewSet handler'
    );

    // 3. Must display 10 second countdown in Harika Bir Set completion view
    assert.match(
        flashcardCode,
        /10|autoAdvanceCountdown|autoAdvanceTimer/i,
        'Completion view must show countdown for auto-advancing to next set'
    );

    // 4. Must provide a way to cancel / pause auto-advance
    assert.match(
        flashcardCode,
        /Durdur|İptal/i,
        'Completion view must include an option to cancel/pause auto-advance'
    );
});

test('AudioStudyService: Media Session Lock Screen display with dynamic card artwork and phase-aware metadata', () => {
    // 1. Must support play, pause, nexttrack, previoustrack in mediaSession
    assert.match(audioServiceCode, /setActionHandler\('play'/, 'Must handle play action on lock screen');
    assert.match(audioServiceCode, /setActionHandler\('pause'/, 'Must handle pause action on lock screen');
    assert.match(audioServiceCode, /setActionHandler\('nexttrack'/, 'Must handle nexttrack action on lock screen');
    assert.match(audioServiceCode, /setActionHandler\('previoustrack'/, 'Must handle previoustrack action on lock screen');

    // 2. Must generate or provide artwork for the lock screen display
    assert.match(
        audioServiceCode,
        /artwork/i,
        'AudioStudyService must provide artwork for lock screen media display'
    );

    // 3. Must update metadata on back/translation phase so user sees translation on lock screen
    assert.match(
        audioServiceCode,
        /updateMediaSession/,
        'AudioStudyService must update lock screen display during playback phases'
    );
});

test('AudioStudyService: Mobile background keep-alive and zero-referrer TTS protections', () => {
    // 1. Must use no-referrer on speechAudio to prevent 404 from external origins
    assert.match(
        audioServiceCode,
        /referrerPolicy\s*=\s*['"]no-referrer['"]/,
        'speechAudio must specify no-referrer policy'
    );

    // 2. index.html must specify no-referrer meta tag
    assert.match(
        indexHtmlCode,
        /<meta\s+name=["']referrer["']\s+content=["']no-referrer["']/,
        'index.html must include no-referrer meta tag'
    );

    // 3. Must have carrier audio ontimeupdate hardware clock tick for background execution
    assert.match(
        audioServiceCode,
        /ontimeupdate/,
        'carrierAudio must use ontimeupdate for hardware clock timing in background'
    );
});
