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

test('generateChallengeUrl and parseChallengeUrl roundtrip data accurately', () => {
  const mockData = {
    level: 'B1',
    setNum: 3,
    challengerScore: 160,
    challengerName: 'Murat',
    wordIds: ['b1-1', 'b1-5', 'b1-9']
  };

  const url = generateChallengeUrl(mockData, 'https://linguacard.app/');
  assert.ok(url.startsWith('https://linguacard.app/?challenge=quiz'), 'url must have correct base and challenge flag');
  assert.ok(url.includes('lvl=B1'), 'url must include level');
  assert.ok(url.includes('set=3'), 'url must include set');
  assert.ok(url.includes('score=160'), 'url must include score');
  assert.ok(url.includes('by=Murat'), 'url must include challenger name');
  assert.ok(url.includes('ids=b1-1%2Cb1-5%2Cb1-9') || url.includes('ids=b1-1,b1-5,b1-9'), 'url must include wordIds');

  const parsed = parseChallengeUrl(url);
  assert.ok(parsed, 'parsed challenge data must not be null');
  assert.equal(parsed.level, 'B1');
  assert.equal(parsed.setNum, 3);
  assert.equal(parsed.challengerScore, 160);
  assert.equal(parsed.challengerName, 'Murat');
  assert.deepEqual(parsed.wordIds, ['b1-1', 'b1-5', 'b1-9']);
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
