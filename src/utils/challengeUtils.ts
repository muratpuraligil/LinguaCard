import type { QuizChallengeData, LibraryLevel } from '../types.ts';

/**
 * Generates a challenge URL containing level, set, score, and wordIds.
 */
export function generateChallengeUrl(data: QuizChallengeData, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
  const params = new URLSearchParams();

  params.set('challenge', 'quiz');
  params.set('lvl', data.level);
  params.set('set', data.setNum.toString());
  params.set('score', data.challengerScore.toString());
  if (data.challengerName) {
    params.set('by', data.challengerName);
  }
  if (data.wordIds && data.wordIds.length > 0) {
    params.set('ids', data.wordIds.join(','));
  }

  return `${base}?${params.toString()}`;
}

/**
 * Parses challenge parameters from window.location.search or hash.
 */
export function parseChallengeUrl(searchOrHash: string): QuizChallengeData | null {
  if (!searchOrHash) return null;

  const clean = searchOrHash.includes('?') 
    ? searchOrHash.substring(searchOrHash.indexOf('?'))
    : (searchOrHash.startsWith('#') ? searchOrHash.replace('#', '?') : searchOrHash);

  const params = new URLSearchParams(clean);
  const challengeType = params.get('challenge');

  if (challengeType !== 'quiz') {
    return null;
  }

  const lvl = (params.get('lvl') || 'A1').toUpperCase() as LibraryLevel;
  const validLevels: LibraryLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const level = validLevels.includes(lvl) ? lvl : 'A1';

  const setNum = parseInt(params.get('set') || '1', 10) || 1;
  const challengerScore = parseInt(params.get('score') || '0', 10) || 0;
  const challengerName = params.get('by') || undefined;

  const idsParam = params.get('ids');
  const wordIds = idsParam ? idsParam.split(',').filter(Boolean) : [];

  return {
    level,
    setNum,
    challengerScore,
    challengerName,
    wordIds
  };
}

/**
 * Creates a WhatsApp share URL with prefilled text.
 */
export function createWhatsAppShareUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Builds the Turkish invitation message for WhatsApp.
 */
export function createChallengeInviteMessage(data: QuizChallengeData, challengeUrl: string): string {
  const who = data.challengerName ? `${data.challengerName}` : 'Arkadaşın';
  return `🔥 *LinguaCard Meydan Okuması!*\n\n${who}, ${data.level} Seviyesi Set ${data.setNum} testini *${data.challengerScore} Puan* ile tamamladı!\n\nBakalım bu seti çözüp onu geçebilecek misin? 🎯\n\nHemen tıkla ve yarış:\n${challengeUrl}`;
}

/**
 * Builds the Turkish result response message for WhatsApp.
 */
export function createChallengeResultMessage(
  data: QuizChallengeData,
  recipientScore: number,
  challengeUrl: string
): { message: string; status: 'won' | 'lost' | 'draw' } {
  let status: 'won' | 'lost' | 'draw' = 'draw';
  let outcomeText = '';

  if (recipientScore > data.challengerScore) {
    status = 'won';
    outcomeText = `🏆 *Meydan okumanı kabul ettim ve seni YENDİM!* 🎉`;
  } else if (recipientScore < data.challengerScore) {
    status = 'lost';
    outcomeText = `😅 *Meydan okumanı kabul ettim ama bu sefer sen kazandın!*`;
  } else {
    status = 'draw';
    outcomeText = `🤝 *Meydan okumanı kabul ettim ve BERABERE kaldık!*`;
  }

  const message = `${outcomeText}\n\n📚 ${data.level} Seviyesi - Set ${data.setNum}\n🎯 Benim Puanım: *${recipientScore}*\n⚡ Senin Puanın: *${data.challengerScore}*\n\nTekrar denemek istersen:\n${challengeUrl}`;

  return { message, status };
}
