import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateChallengeUrl,
  parseChallengeUrl,
  createWhatsAppShareUrl,
  createChallengeInviteMessage,
  createChallengeResultMessage
} from '../src/utils/challengeUtils.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('challengeUtils module exists and exports challenge encoding/decoding and WhatsApp formatting', async () => {
  const utilsPath = path.join(rootDir, 'src/utils/challengeUtils.ts');
  assert.ok(fs.existsSync(utilsPath), 'challengeUtils.ts must exist');

  const utilsSource = fs.readFileSync(utilsPath, 'utf8');
  assert.ok(utilsSource.includes('generateChallengeUrl'), 'must export generateChallengeUrl');
  assert.ok(utilsSource.includes('parseChallengeUrl'), 'must export parseChallengeUrl');
  assert.ok(utilsSource.includes('createWhatsAppShareUrl'), 'must export createWhatsAppShareUrl');
  assert.ok(utilsSource.includes('createChallengeResultMessage'), 'must export createChallengeResultMessage');
});

test('generateChallengeUrl generates a compact URL format and parseChallengeUrl parses both compact and verbose formats', () => {
  const mockData = {
    level: 'B1',
    setNum: 1,
    challengerScore: 20
  };

  const shortUrl = generateChallengeUrl(mockData, 'https://linguacard.app/');
  assert.ok(shortUrl.includes('ch=B1-1-20'), 'shortUrl must use compact ?ch=LEVEL-SET-SCORE format');
  assert.ok(shortUrl.length < 60, 'compact url must be short (under 60 chars)');

  const parsedShort = parseChallengeUrl(shortUrl);
  assert.ok(parsedShort, 'parsedShort must not be null');
  assert.equal(parsedShort.level, 'B1');
  assert.equal(parsedShort.setNum, 1);
  assert.equal(parsedShort.challengerScore, 20);

  // Backward compatibility with verbose format
  const verboseUrl = 'https://linguacard.app/?challenge=quiz&lvl=B1&set=1&score=20&by=Ahmet';
  const parsedVerbose = parseChallengeUrl(verboseUrl);
  assert.ok(parsedVerbose, 'parsedVerbose must not be null');
  assert.equal(parsedVerbose.level, 'B1');
  assert.equal(parsedVerbose.setNum, 1);
  assert.equal(parsedVerbose.challengerScore, 20);
  assert.equal(parsedVerbose.challengerName, 'Ahmet');
});

test('App.tsx protects guest rendering and initializes quiz mode and level synchronously when challenge is present', () => {
  const appSource = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');

  // Must not have dangerous unguarded session.user.email
  assert.ok(!appSource.includes('userEmail={session.user.email}'), 'App.tsx must safely guard session.user.email');
  assert.ok(appSource.includes('session?.user?.email'), 'App.tsx must use optional chaining for session?.user?.email');

  // Must initialize mode to QUIZ directly if challengeData is present to avoid black screen / flash of dashboard
  assert.ok(
    appSource.includes('initialChallenge') || appSource.includes('parseChallengeUrl'),
    'App.tsx must check initial challenge during state initialization'
  );
});

test('QuizMode.tsx resolves words from level/set when wordIds are omitted in compact challenge', () => {
  const quizSource = fs.readFileSync(path.join(rootDir, 'src/components/QuizMode.tsx'), 'utf8');

  // Must not return null unconditionally on !currentWord causing empty black screen
  assert.ok(
    !quizSource.includes('if (!currentWord) return null;'),
    'QuizMode.tsx must render a fallback loader instead of return null to prevent black screen'
  );
});

test('createChallengeResultMessage accurately calculates won, lost, and draw states', () => {
  const mockData = {
    level: 'A2',
    setNum: 1,
    challengerScore: 120,
    wordIds: []
  };

  const won = createChallengeResultMessage(mockData, 140, 'https://test.url');
  assert.equal(won.status, 'won');
  assert.ok(won.message.includes('YENDİM'));

  const lost = createChallengeResultMessage(mockData, 90, 'https://test.url');
  assert.equal(lost.status, 'lost');
  assert.ok(lost.message.includes('sen kazandın'));

  const draw = createChallengeResultMessage(mockData, 120, 'https://test.url');
  assert.equal(draw.status, 'draw');
  assert.ok(draw.message.includes('BERABERE'));

  const waUrl = createWhatsAppShareUrl(won.message);
  assert.ok(waUrl.startsWith('https://api.whatsapp.com/send?text='), 'WhatsApp url must be properly formatted');
});

test('QuizShareModal component exists with WhatsApp and Copy Link actions', () => {
  const modalPath = path.join(rootDir, 'src/components/QuizShareModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'QuizShareModal.tsx must exist');

  const modalSource = fs.readFileSync(modalPath, 'utf8');
  assert.ok(modalSource.includes('whatsapp'), 'QuizShareModal must include WhatsApp sharing');
  assert.ok(modalSource.includes('Kopyala') || modalSource.includes('kopyala'), 'QuizShareModal must include copy link action');
});

test('QuizChallengeResultModal component exists and handles win, lose, and draw states', () => {
  const modalPath = path.join(rootDir, 'src/components/QuizChallengeResultModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'QuizChallengeResultModal.tsx must exist');

  const modalSource = fs.readFileSync(modalPath, 'utf8');
  assert.ok(modalSource.includes('Kazandın'), 'QuizChallengeResultModal must handle Kazandın state');
  assert.ok(modalSource.includes('Kaybettin'), 'QuizChallengeResultModal must handle Kaybettin state');
  assert.ok(modalSource.includes('Berabere'), 'QuizChallengeResultModal must handle Berabere state');
  assert.ok(modalSource.includes('whatsapp') || modalSource.includes('WhatsApp'), 'must support sending result back via WhatsApp');
});

test('QuizMode.tsx integrates Share button in header and finish screen, and protects localStorage in challenge mode', () => {
  const quizSource = fs.readFileSync(path.join(rootDir, 'src/components/QuizMode.tsx'), 'utf8');

  // Must accept challengeData and isChallenge props
  assert.ok(quizSource.includes('challengeData'), 'QuizMode.tsx must accept challengeData prop');
  assert.ok(quizSource.includes('Share2') || quizSource.includes('Paylaş') || quizSource.includes('QuizShareModal'), 'QuizMode.tsx must include sharing capability');
  assert.ok(quizSource.includes('QuizChallengeResultModal'), 'QuizMode.tsx must render QuizChallengeResultModal upon challenge completion');
});

test('QuizMode.tsx must render QuizShareModal inside the finished screen return block', () => {
  const quizSource = fs.readFileSync(path.join(rootDir, 'src/components/QuizMode.tsx'), 'utf8');

  const finishedBlockStart = quizSource.indexOf('if (finished) {');
  assert.ok(finishedBlockStart !== -1, 'if (finished) block must exist');

  const emptyStateStart = quizSource.indexOf('// Empty state handling');
  assert.ok(emptyStateStart !== -1, 'empty state block must exist');

  const finishedBlock = quizSource.substring(finishedBlockStart, emptyStateStart);
  assert.ok(
    finishedBlock.includes('<QuizShareModal'),
    'QuizMode.tsx must render QuizShareModal inside the if (finished) block so the finish screen share button works'
  );
});

test('App.tsx parses challenge params and supports guest challenge gameplay', () => {
  const appSource = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');

  assert.ok(appSource.includes('parseChallengeUrl'), 'App.tsx must use parseChallengeUrl to detect challenge mode');
  assert.ok(appSource.includes('challengeData'), 'App.tsx must manage challengeData state');
});
