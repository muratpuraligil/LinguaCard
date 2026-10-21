import type { QuizChallengeData, LibraryLevel } from '../types.ts';

/**
 * Generates a challenge URL containing level, set, score, and optional custom parameters.
 * Produces an ultra-compact URL format (?ch=LEVEL-SET-SCORE) to fit neatly on mobile/WhatsApp without line wrapping.
 */
export function generateChallengeUrl(data: QuizChallengeData, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
  
  // Compact format: ?ch=LEVEL-SET-SCORE[-NAME]
  let chValue = `${data.level}-${data.setNum}-${data.challengerScore}`;
  if (data.challengerName) {
    chValue += `-${encodeURIComponent(data.challengerName)}`;
  }

  // If non-library custom wordIds exist, append as query parameter (rare)
  const isCustomWords = data.wordIds && data.wordIds.length > 0 && !data.wordIds[0].includes('-lib-');
  const query = isCustomWords ? `?ch=${chValue}&ids=${data.wordIds!.join(',')}` : `?ch=${chValue}`;

  return `${base}${query}`;
}

/**
 * Parses challenge parameters from window.location.search or hash.
 * Supports both compact ?ch=LEVEL-SET-SCORE and legacy/verbose ?challenge=quiz&lvl=...
 */
export function parseChallengeUrl(searchOrHash: string): QuizChallengeData | null {
  if (!searchOrHash) return null;

  const clean = searchOrHash.includes('?') 
    ? searchOrHash.substring(searchOrHash.indexOf('?'))
    : (searchOrHash.startsWith('#') ? searchOrHash.replace('#', '?') : searchOrHash);

  const params = new URLSearchParams(clean);

  // 1. Check compact format: ?ch=LEVEL-SET-SCORE[-NAME]
  const ch = params.get('ch');
  if (ch) {
    const parts = ch.split('-');
    if (parts.length >= 3) {
      const lvl = parts[0].toUpperCase() as LibraryLevel;
      const validLevels: LibraryLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      const level = validLevels.includes(lvl) ? lvl : 'A1';
      const setNum = parseInt(parts[1], 10) || 1;
      const challengerScore = parseInt(parts[2], 10) || 0;
      const challengerName = parts.length > 3 ? decodeURIComponent(parts.slice(3).join('-')) : (params.get('by') || undefined);

      const idsParam = params.get('ids');
      const wordIds = idsParam ? idsParam.split(',').filter(Boolean) : undefined;

      return {
        level,
        setNum,
        challengerScore,
        challengerName,
        wordIds
      };
    }
  }

  // 2. Check standard / verbose format: ?challenge=quiz or ?c=q
  const challengeType = params.get('challenge') || params.get('c');

  if (challengeType !== 'quiz' && challengeType !== 'q') {
    return null;
  }

  const lvl = (params.get('lvl') || params.get('l') || 'A1').toUpperCase() as LibraryLevel;
  const validLevels: LibraryLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const level = validLevels.includes(lvl) ? lvl : 'A1';

  const setNum = parseInt(params.get('set') || params.get('s') || '1', 10) || 1;
  const challengerScore = parseInt(params.get('score') || params.get('sc') || '0', 10) || 0;
  const challengerName = params.get('by') || undefined;

  const idsParam = params.get('ids');
  const wordIds = idsParam ? idsParam.split(',').filter(Boolean) : undefined;

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
