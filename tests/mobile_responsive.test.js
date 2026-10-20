import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('index.html includes viewport meta tag for mobile responsiveness', () => {
    const indexPath = path.resolve(process.cwd(), 'index.html');
    const content = fs.readFileSync(indexPath, 'utf-8');
    assert.match(
        content,
        /<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width[^"']*["']\s*\/?>/i,
        'index.html must include responsive viewport meta tag'
    );
});

test('FlashcardMode.tsx header has responsive mobile padding, sizing and overflow protection', () => {
    const flashcardFilePath = path.resolve(process.cwd(), 'src/components/FlashcardMode.tsx');
    const content = fs.readFileSync(flashcardFilePath, 'utf-8');

    // Header container should have compact padding on mobile (e.g., px-3 sm:px-6)
    assert.match(
        content,
        /px-3\s+sm:px-6/,
        'Header container should have compact mobile horizontal padding (px-3 sm:px-6)'
    );

    // Mode action buttons should have responsive font size and padding
    assert.match(
        content,
        /text-\[10px\]\s+sm:text-xs/,
        'Header buttons should use text-[10px] sm:text-xs for mobile screens'
    );
    assert.match(
        content,
        /px-2\.5\s+py-1\.5\s+sm:px-3\.5\s+sm:py-2/,
        'Listening Mode button should use compact padding px-2.5 py-1.5 sm:px-3.5 sm:py-2'
    );

    // Level tabs should have overflow-x-auto and no-scrollbar
    assert.match(
        content,
        /overflow-x-auto\s+no-scrollbar/,
        'Level tabs container should have overflow-x-auto and no-scrollbar for smooth horizontal scrolling'
    );

    // Flashcard container should adapt height on mobile to prevent vertical scroll
    assert.match(
        content,
        /min-h-\[250px\]\s+sm:min-h-\[290px\]/,
        'Flashcard should use responsive min-height min-h-[250px] sm:min-h-[290px]'
    );
});

test('ListeningModeBar.tsx has mobile responsive width, touch targets and overflow protection', () => {
    const listeningBarPath = path.resolve(process.cwd(), 'src/components/ListeningModeBar.tsx');
    const content = fs.readFileSync(listeningBarPath, 'utf-8');

    // Container width responsive
    assert.match(
        content,
        /max-w-md\s+sm:max-w-xl/,
        'ListeningModeBar should use max-w-md sm:max-w-xl for compact mobile width'
    );

    // Minimum touch targets (min-w-[36px] min-h-[36px]) for audio control buttons
    const minTargetMatches = content.match(/min-w-\[36px\]\s+min-h-\[36px\]/g);
    assert.ok(
        minTargetMatches && minTargetMatches.length >= 3,
        'Control buttons (Prev, Play/Pause, Next) must have min-w-[36px] min-h-[36px] touch target sizes'
    );
});
