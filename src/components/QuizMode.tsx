import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Word, LanguageDirection, QuizStudyMode, LibraryLevel, QuizChallengeData } from '../types';
import { CheckCircle, ArrowLeft, Languages, Zap, BookOpen, Sparkles, RefreshCw, X, Volume2, VolumeX, SlidersHorizontal, Share2, Trophy, Swords } from 'lucide-react';
import QuizShareModal from './QuizShareModal';
import QuizChallengeResultModal from './QuizChallengeResultModal';
import { userStateService } from '../services/userStateService';

const QUIZ_SET_SIZE = 20;
const LEVELS: LibraryLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const LOCAL_STORAGE_KEYS = {
  DIRECTION: 'lingua_quiz_direction',
  TTS_ENABLED: 'lingua_quiz_tts_enabled',
};

const getQuizActiveIdsKey = (mode: QuizStudyMode, level?: LibraryLevel) =>
  mode === 'LIBRARY' ? `lingua_quiz_active_ids_${level || 'A1'}` : 'lingua_quiz_active_ids';

const getQuizCurrentIndexKey = (mode: QuizStudyMode, level?: LibraryLevel) =>
  mode === 'LIBRARY' ? `lingua_quiz_current_index_${level || 'A1'}` : 'lingua_quiz_current_index';

const getQuizSetNumKey = (mode: QuizStudyMode, level?: LibraryLevel) =>
  mode === 'LIBRARY' ? `lingua_quiz_set_num_${level || 'A1'}` : 'lingua_quiz_set_num';

const getStoredQuizIndex = (mode: QuizStudyMode, level?: LibraryLevel): number => {
  const saved = localStorage.getItem(getQuizCurrentIndexKey(mode, level));
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }
  return 0;
};

const getStoredQuizSetNum = (mode: QuizStudyMode, level?: LibraryLevel): number => {
  const saved = localStorage.getItem(getQuizSetNumKey(mode, level));
  if (saved) {
    const parsed = parseInt(saved, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 1;
};

const getStoredQuizActiveIds = (mode: QuizStudyMode, level?: LibraryLevel): string[] => {
  const saved = localStorage.getItem(getQuizActiveIdsKey(mode, level));
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return [];
};

interface QuizModeProps {
  words: Word[];
  allWords: Word[];
  studyMode?: QuizStudyMode;
  selectedLevel?: LibraryLevel;
  challengeData?: QuizChallengeData | null;
  isChallenge?: boolean;
  onLevelChange?: (level: LibraryLevel) => void;
  onOpenModeSelection?: () => void;
  onExit: () => void;
  onGoToFlashcards?: () => void;
  onGoToSentences?: () => void;
  userId?: string;
}

const QuizMode: React.FC<QuizModeProps> = ({
  words,
  allWords,
  studyMode = 'USER_WORDS',
  selectedLevel = 'A1',
  challengeData,
  isChallenge = false,
  onLevelChange,
  onOpenModeSelection,
  onExit,
  onGoToFlashcards,
  onGoToSentences,
  userId
}) => {
  const currentMode: QuizStudyMode = isChallenge ? 'LIBRARY' : studyMode;
  const currentLevel: LibraryLevel = isChallenge && challengeData ? challengeData.level : selectedLevel;

  // Filter and sort words
  const sortedWords = useMemo(() => {
    if (currentMode === 'LIBRARY') {
      return words.filter(w => !w.set_name || w.set_name.toUpperCase() === currentLevel.toUpperCase());
    }
    return words
      .filter(w => !w.is_archived && (!w.set_name || w.set_name === "Demo Kelimeler"))
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  }, [words, currentMode, currentLevel]);

  const totalSets = Math.max(1, Math.ceil(sortedWords.length / QUIZ_SET_SIZE));

  const [currentSetNum, setCurrentSetNum] = useState<number>(() => {
    if (isChallenge && challengeData) return challengeData.setNum;
    return getStoredQuizSetNum(currentMode, currentLevel);
  });

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (isChallenge) return 0;
    return getStoredQuizIndex(currentMode, currentLevel);
  });

  const [activeIds, setActiveIds] = useState<string[]>(() => {
    if (isChallenge && challengeData) {
      if (challengeData.wordIds && challengeData.wordIds.length > 0) {
        return challengeData.wordIds;
      }
      const setStart = (challengeData.setNum - 1) * QUIZ_SET_SIZE;
      const targetPool = words.length > 0 ? words : (allWords.length > 0 ? allWords : []);
      const setSlice = targetPool.slice(setStart, setStart + QUIZ_SET_SIZE);
      if (setSlice.length > 0) {
        return setSlice.map(w => w.id);
      }
      return [];
    }
    return getStoredQuizActiveIds(currentMode, currentLevel);
  });

  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);

  // Modals state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showChallengeResultModal, setShowChallengeResultModal] = useState(false);

  const [direction, setDirection] = useState<LanguageDirection>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.DIRECTION);
    return (saved as LanguageDirection) || LanguageDirection.TR_EN;
  });

  const [incorrectWords, setIncorrectWords] = useState<Word[]>([]);
  const [showWrongAnswersModal, setShowWrongAnswersModal] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.TTS_ENABLED);
    return saved === null ? true : saved === 'true';
  });

  const answerTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeSessionRef = useRef({
    currentMode,
    currentLevel,
    currentIndex,
    currentSetNum,
    activeIds
  });

  useEffect(() => {
    activeSessionRef.current = {
      currentMode,
      currentLevel,
      currentIndex,
      currentSetNum,
      activeIds
    };
  }, [currentMode, currentLevel, currentIndex, currentSetNum, activeIds]);

  const prevConfigRef = useRef({ currentMode, currentLevel });

  // Handle switching between modes or levels seamlessly
  useEffect(() => {
    if (isChallenge) return;

    const prev = prevConfigRef.current;
    const modeOrLevelChanged = prev.currentMode !== currentMode || prev.currentLevel !== currentLevel;

    if (modeOrLevelChanged) {
      // 1. Save outgoing state
      localStorage.setItem(getQuizCurrentIndexKey(prev.currentMode, prev.currentLevel), activeSessionRef.current.currentIndex.toString());
      localStorage.setItem(getQuizSetNumKey(prev.currentMode, prev.currentLevel), activeSessionRef.current.currentSetNum.toString());
      if (activeSessionRef.current.activeIds.length > 0) {
        localStorage.setItem(getQuizActiveIdsKey(prev.currentMode, prev.currentLevel), JSON.stringify(activeSessionRef.current.activeIds));
      }
      if (userId) {
        userStateService.saveStateBulk(userId, {
          [getQuizCurrentIndexKey(prev.currentMode, prev.currentLevel)]: activeSessionRef.current.currentIndex.toString(),
          [getQuizSetNumKey(prev.currentMode, prev.currentLevel)]: activeSessionRef.current.currentSetNum.toString(),
          ...(activeSessionRef.current.activeIds.length > 0 ? { [getQuizActiveIdsKey(prev.currentMode, prev.currentLevel)]: JSON.stringify(activeSessionRef.current.activeIds) } : {})
        });
      }

      // 2. Load incoming state
      const targetIndex = getStoredQuizIndex(currentMode, currentLevel);
      const targetSet = getStoredQuizSetNum(currentMode, currentLevel);
      let targetActiveIds = getStoredQuizActiveIds(currentMode, currentLevel);

      prevConfigRef.current = { currentMode, currentLevel };

      setCurrentIndex(targetIndex);
      setCurrentSetNum(targetSet);
      setSelectedOption(null);
      setShowResult(false);
      setFinished(false);
      setScore(0);
      setIncorrectWords([]);

      if (currentMode === 'LIBRARY' && userId) {
        userStateService.saveStateKey(userId, 'lingua_quiz_last_level', currentLevel);
      }

      // 3. Sync activeIds with words
      if (sortedWords.length === 0) {
        setActiveIds([]);
        return;
      }

      if (targetActiveIds.length > 0) {
        const validIds = targetActiveIds.filter(id => sortedWords.some(w => w.id === id));
        targetActiveIds = validIds;
      }

      if (targetActiveIds.length === 0) {
        const setStart = (targetSet - 1) * QUIZ_SET_SIZE;
        const setEnd = Math.min(setStart + QUIZ_SET_SIZE, sortedWords.length);
        const setWords = sortedWords.slice(setStart, setEnd);
        if (setWords.length > 0) {
          const shuffled = [...setWords].sort(() => Math.random() - 0.5);
          targetActiveIds = shuffled.map(w => w.id);
          localStorage.setItem(getQuizActiveIdsKey(currentMode, currentLevel), JSON.stringify(targetActiveIds));
        }
      }

      setActiveIds(targetActiveIds);
      return;
    }

    prevConfigRef.current = { currentMode, currentLevel };
  }, [currentMode, currentLevel, sortedWords, isChallenge, userId]);

  useEffect(() => {
    if (!isChallenge) {
      localStorage.setItem(getQuizSetNumKey(currentMode, currentLevel), currentSetNum.toString());
      if (userId) {
        userStateService.saveStateKey(userId, getQuizSetNumKey(currentMode, currentLevel), currentSetNum.toString());
      }
    }
  }, [currentSetNum, currentMode, currentLevel, isChallenge, userId]);

  useEffect(() => {
    if (!isChallenge) {
      localStorage.setItem(getQuizCurrentIndexKey(currentMode, currentLevel), currentIndex.toString());
      if (userId) {
        userStateService.saveStateKey(userId, getQuizCurrentIndexKey(currentMode, currentLevel), currentIndex.toString());
      }
    }
  }, [currentIndex, currentMode, currentLevel, isChallenge, userId]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.DIRECTION, direction);
    if (userId) {
      userStateService.saveStateKey(userId, LOCAL_STORAGE_KEYS.DIRECTION, direction);
    }
  }, [direction, userId]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (answerTimerRef.current) {
        clearTimeout(answerTimerRef.current);
      }
      if (!isChallenge && userId) {
        const current = activeSessionRef.current;
        userStateService.saveStateBulk(userId, {
          [getQuizCurrentIndexKey(current.currentMode, current.currentLevel)]: current.currentIndex.toString(),
          [getQuizSetNumKey(current.currentMode, current.currentLevel)]: current.currentSetNum.toString()
        });
      }
    };
  }, [isChallenge, userId]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TTS_ENABLED, isTtsEnabled.toString());
  }, [isTtsEnabled]);

  // Set generator (Standard & Challenge)
  useEffect(() => {
    if (sortedWords.length === 0) return;

    if (isChallenge) {
      if (challengeData?.wordIds && challengeData.wordIds.length > 0 && activeIds.length === 0) {
        setActiveIds(challengeData.wordIds);
        return;
      }
      if (activeIds.length > 0) return;

      const setStart = (currentSetNum - 1) * QUIZ_SET_SIZE;
      const setEnd = Math.min(setStart + QUIZ_SET_SIZE, sortedWords.length);
      const setWords = sortedWords.slice(setStart, setEnd);
      if (setWords.length > 0) {
        const newIds = setWords.map(w => w.id);
        setActiveIds(newIds);
      }
      return;
    }

    const hasSaved = localStorage.getItem(getQuizActiveIdsKey(currentMode, currentLevel));
    const savedSetNum = localStorage.getItem(getQuizSetNumKey(currentMode, currentLevel));

    // If activeIds already matches the currentSetNum's words, skip generating
    if (hasSaved && savedSetNum && parseInt(savedSetNum, 10) === currentSetNum && activeIds.length > 0) {
      return;
    }

    const setStart = (currentSetNum - 1) * QUIZ_SET_SIZE;
    const setEnd = Math.min(setStart + QUIZ_SET_SIZE, sortedWords.length);
    const setWords = sortedWords.slice(setStart, setEnd);

    if (setWords.length > 0) {
      const shuffled = [...setWords].sort(() => Math.random() - 0.5);
      const newIds = shuffled.map(w => w.id);
      localStorage.setItem(getQuizActiveIdsKey(currentMode, currentLevel), JSON.stringify(newIds));
      localStorage.setItem(getQuizCurrentIndexKey(currentMode, currentLevel), '0');
      setActiveIds(newIds);
      setCurrentIndex(0);
      setScore(0);
      setFinished(false);
      setIncorrectWords([]);
    }
  }, [sortedWords, currentSetNum, activeIds.length, currentMode, currentLevel, isChallenge, challengeData]);

  const quizSet = useMemo(() => {
    return activeIds
      .map(id => sortedWords.find(w => w.id === id) || words.find(w => w.id === id) || allWords.find(w => w.id === id))
      .filter((w): w is Word => !!w);
  }, [activeIds, sortedWords, words, allWords]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }, []);

  const currentWord = quizSet[currentIndex];

  const options = useMemo(() => {
    if (!currentWord) return [];

    const correct = direction === LanguageDirection.EN_TR ? currentWord.turkish : currentWord.english;
    const key = direction === LanguageDirection.EN_TR ? 'turkish' : 'english';

    const pool = allWords.length > 3 ? allWords : (sortedWords.length > 3 ? sortedWords : words);
    const otherWords = pool.filter(w => w.id !== currentWord.id);
    const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random());
    const wrongAnswers = shuffledOthers.slice(0, 3).map(w => (w as any)[key]);

    while (wrongAnswers.length < 3) {
      wrongAnswers.push("Kelime " + Math.floor(Math.random() * 100));
    }

    return [correct, ...wrongAnswers].sort(() => 0.5 - Math.random());
  }, [currentWord, allWords, sortedWords, words, direction]);

  const handleSelect = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
    setShowResult(true);

    const correct = direction === LanguageDirection.EN_TR ? currentWord.turkish : currentWord.english;
    
    // Auto-read English word on answer if TTS is enabled
    if (isTtsEnabled && currentWord?.english) {
      speak(currentWord.english);
    }

    if (option === correct) {
      setScore(prev => prev + 10);
    } else {
      setIncorrectWords(prev => [...prev, currentWord]);
    }

    if (answerTimerRef.current) {
      clearTimeout(answerTimerRef.current);
    }
    answerTimerRef.current = setTimeout(() => {
      if (currentIndex < quizSet.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setShowResult(false);
      } else {
        setFinished(true);
        if (isChallenge) {
          setShowChallengeResultModal(true);
        }
      }
    }, 1200);
  };

  const handleNewSet = useCallback(() => {
    const nextSetNum = currentSetNum < totalSets ? currentSetNum + 1 : 1;
    if (!isChallenge) {
      localStorage.removeItem(getQuizActiveIdsKey(currentMode, currentLevel));
    }
    setActiveIds([]);
    setCurrentSetNum(nextSetNum);
    setSelectedOption(null);
    setShowResult(false);
    setFinished(false);
    setScore(0);
    setIncorrectWords([]);
    setShowWrongAnswersModal(false);
  }, [currentSetNum, totalSets, currentMode, currentLevel, isChallenge]);

  const handlePlayAgain = () => {
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setShowResult(false);
    setFinished(false);
    setIncorrectWords([]);
    setShowChallengeResultModal(false);
  };

  const progressPercent = quizSet.length > 0 ? ((currentIndex + 1) / quizSet.length) * 100 : 0;

  if (finished) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-3 sm:p-4 text-center font-['Plus_Jakarta_Sans'] relative">
        <div className="bg-zinc-900 border border-emerald-500/20 p-4 sm:p-5 rounded-3xl shadow-2xl w-full max-w-sm relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
          <CheckCircle className="text-emerald-500 w-9 h-9 mx-auto mb-1 animate-bounce" />
          <h2 className="text-xl font-black text-white mb-0.5">Harika İş!</h2>
          <p className="text-slate-500 font-bold text-xs mb-2.5">Testi başarıyla tamamladın.</p>

          <div className="mb-3 space-y-1.5">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-4xl font-black text-emerald-500 tracking-tight">{score}</span>
              <span className="text-emerald-600 text-[11px] font-black uppercase tracking-wider">Puan</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Doğru Sayısı</p>
                  <p className="text-sm font-black text-white">{score / 10} / {quizSet.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Başarı Oranı</p>
                  <p className="text-sm font-black text-emerald-500">%{Math.round(((score / 10) / (quizSet.length || 1)) * 100)}</p>
                </div>
              </div>

              {incorrectWords.length > 0 && (
                <button
                  onClick={() => setShowWrongAnswersModal(true)}
                  className="text-[11px] font-bold text-red-400 hover:text-red-350 transition-all underline decoration-red-500/50 underline-offset-4 mt-0.5 block mx-auto hover:scale-105 active:scale-95 cursor-pointer"
                >
                  Yanlışları görmek için tıkla ({incorrectWords.length})
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            {isChallenge && challengeData ? (
              <button
                onClick={() => setShowChallengeResultModal(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-2.5 rounded-xl font-black text-xs hover:scale-105 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Trophy size={15} /> Meydan Okuma Sonucunu Gör
              </button>
            ) : (
              <>
                {currentMode === 'LIBRARY' && (
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="w-full py-2.5 bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-black border border-[#25D366]/30 rounded-xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Swords size={15} /> Arkadaşlarını Challenge'a Davet Et
                  </button>
                )}

                <button
                  onClick={handleNewSet}
                  className="w-full bg-white text-black py-2.5 rounded-xl font-black text-xs hover:scale-105 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={15} /> Yeni Set ile Devam Et
                </button>

                {onGoToFlashcards && (
                  <button
                    onClick={onGoToFlashcards}
                    className="w-full py-2.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-xl font-black text-xs hover:bg-yellow-500 hover:text-black transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <BookOpen size={15} /> Kartlarla Çalış
                  </button>
                )}

                {onGoToSentences && (
                  <button
                    onClick={onGoToSentences}
                    className="w-full py-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl font-black text-xs hover:bg-purple-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Sparkles size={15} /> Cümle Pratiği Yap
                  </button>
                )}
              </>
            )}

            <button
              onClick={onExit}
              className="w-full py-2.5 bg-zinc-900 text-slate-400 rounded-xl font-black text-xs border border-white/5 active:scale-95 transition-all hover:text-white"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>

        {/* Yanlışlar Modalı */}
        {showWrongAnswersModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] animate-fadeIn">
            <div className="bg-[#0c0c0c] w-full max-w-md rounded-[40px] p-6 border border-red-500/20 shadow-2xl relative max-h-[80vh] flex flex-col">
              <button
                onClick={() => setShowWrongAnswersModal(false)}
                className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-zinc-800 text-slate-400 hover:text-white rounded-full transition-all z-50 active:scale-90"
              >
                <X size={20} strokeWidth={2.5} />
              </button>

              <div className="text-center mb-6 mt-2">
                <h3 className="text-2xl font-black text-white">Yapılan Yanlışlar</h3>
                <p className="text-slate-500 text-xs font-bold mt-1">
                  Bu testte yanlış cevapladığın kelimeler
                </p>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                {incorrectWords.map((word) => (
                  <div 
                    key={word.id} 
                    className="bg-zinc-900/50 border border-white/5 p-4 rounded-3xl flex items-center justify-between gap-4 hover:border-red-500/20 transition-all group text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-black text-white truncate group-hover:text-red-400 transition-colors">
                        {word.english}
                      </p>
                      <p className="text-xs font-bold text-slate-500 truncate">
                        {word.turkish}
                      </p>
                      {word.example_sentence && (
                        <p className="text-[10px] text-slate-600 italic mt-1 font-medium line-clamp-2">
                          "{word.example_sentence}"
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => speak(word.english)}
                      className="p-3 bg-white/5 text-slate-400 hover:text-white hover:bg-zinc-800 rounded-2xl transition-all active:scale-90 shrink-0"
                      title="Telaffuz Dinle"
                    >
                      <Volume2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowWrongAnswersModal(false)}
                className="mt-6 w-full py-4 bg-zinc-900 text-white border border-white/5 rounded-3xl font-black text-sm active:scale-95 transition-all hover:bg-zinc-800"
              >
                Kapat
              </button>
            </div>
          </div>
        )}

        {/* Meydan Okuma Sonuç Modalı */}
        {isChallenge && challengeData && (
          <QuizChallengeResultModal
            isOpen={showChallengeResultModal}
            onClose={() => {
              setShowChallengeResultModal(false);
              onExit();
            }}
            challengeData={challengeData}
            recipientScore={score}
            onPlayAgain={handlePlayAgain}
          />
        )}

        {/* Paylaş Modalı */}
        <QuizShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          challengeData={{
            level: currentLevel,
            setNum: currentSetNum,
            challengerScore: score,
            wordIds: activeIds
          }}
        />
      </div>
    );
  }

  // Empty state handling
  if (sortedWords.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center font-['Plus_Jakarta_Sans'] text-white relative">
        <div className="bg-zinc-900 border border-white/10 p-8 rounded-[40px] max-w-md w-full shadow-2xl">
          <BookOpen className="w-16 h-16 text-emerald-400 mx-auto mb-4 opacity-70" />
          <h2 className="text-2xl font-black mb-2">
            {currentMode === 'LIBRARY' ? `${currentLevel} Seviyesinde Kelime Bulunamadı` : 'Kelimeleriniz Bulunamadı'}
          </h2>
          <p className="text-slate-400 text-sm font-bold mb-6 leading-relaxed">
            {currentMode === 'LIBRARY'
              ? 'Bu seviyede kelime bulunamadı veya yükleniyor.'
              : 'Henüz kelime listenizde kelime bulunmuyor. Kütüphaneden test çözebilir ya da kelime ekleyebilirsiniz.'}
          </p>
          <div className="space-y-3">
            {onOpenModeSelection && (
              <button
                onClick={onOpenModeSelection}
                className="w-full py-3.5 bg-emerald-500 text-black font-black rounded-2xl hover:bg-emerald-400 transition-all active:scale-95"
              >
                Farklı Bir Mod Seç
              </button>
            )}
            <button
              onClick={onExit}
              className="w-full py-3.5 bg-zinc-800 text-slate-300 font-bold rounded-2xl hover:bg-zinc-700 transition-all active:scale-95"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-['Plus_Jakarta_Sans'] text-white">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
          Yarışma Soruları Hazırlanıyor...
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen bg-black flex flex-col justify-between font-['Plus_Jakarta_Sans'] relative overflow-hidden text-white select-none">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500 opacity-20"></div>

      {/* Header */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-2 sm:py-3 relative z-10 shrink-0">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4 w-full">
          <button 
            onClick={onExit} 
            className="p-2 sm:p-2.5 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all flex items-center gap-1.5 shrink-0"
            title="Ana Sayfa"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline text-xs font-bold">Ana Sayfa</span>
          </button>

          {/* Center: Mod Seç, Toggles & Level Tabs */}
          <div className="flex flex-col items-center gap-1 sm:gap-1.5 justify-self-center max-w-full min-w-0">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
              {isChallenge && challengeData ? (
                <div className="bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-300 font-black text-[10px] sm:text-xs flex items-center gap-1.5 shadow-sm">
                  <Swords size={13} className="text-emerald-400" />
                  <span>Hedef: {challengeData.challengerScore} Puan ({challengeData.challengerName || 'Arkadaşın'})</span>
                </div>
              ) : (
                onOpenModeSelection && (
                  <button
                    onClick={onOpenModeSelection}
                    className="bg-purple-600/20 border border-purple-500/30 px-2.5 sm:px-3 py-1 sm:py-1 rounded-full text-purple-300 font-black text-[10px] sm:text-xs flex items-center gap-1 hover:bg-purple-600 hover:text-white transition-all shrink-0"
                    title="Test Çalışma Modunu Değiştir"
                  >
                    <SlidersHorizontal size={12} />
                    <span>Mod Seç</span>
                  </button>
                )
              )}

              <button
                onClick={() => setDirection(d => d === LanguageDirection.EN_TR ? LanguageDirection.TR_EN : LanguageDirection.EN_TR)}
                className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 sm:px-3 py-1 sm:py-1 rounded-full text-emerald-500 font-black text-[10px] sm:text-xs tracking-wider uppercase flex items-center gap-1 hover:bg-emerald-500/20 transition-all shrink-0"
              >
                <Languages size={12} /> {direction.replace('_', ' → ')}
              </button>

              <button
                onClick={() => setIsTtsEnabled(prev => !prev)}
                className={`p-1.5 rounded-full border transition-all shrink-0 ${
                  isTtsEnabled 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20" 
                    : "bg-zinc-900 border-white/5 text-slate-500 hover:bg-zinc-800"
                }`}
                title={isTtsEnabled ? "Sesli Okuma Açık" : "Sesli Okuma Kapalı"}
              >
                {isTtsEnabled ? (
                  <Volume2 size={13} />
                ) : (
                  <div className="relative flex items-center justify-center">
                    <VolumeX size={13} className="opacity-60" />
                    <div className="absolute w-[14px] h-[1.5px] bg-slate-500 rotate-45" />
                  </div>
                )}
              </button>
            </div>

            {/* Level Tabs for Library Mode (hidden during challenge to keep set locked) */}
            {currentMode === 'LIBRARY' && !isChallenge && onLevelChange && (
              <div className="flex items-center justify-center gap-1 overflow-x-auto no-scrollbar max-w-full py-0.5">
                {LEVELS.map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => {
                      if (lvl !== currentLevel) {
                        onLevelChange(lvl);
                      }
                    }}
                    className={`px-2.5 py-0.5 sm:px-3 sm:py-0.5 rounded-full font-black text-[10px] sm:text-xs transition-all border shrink-0 ${
                      currentLevel === lvl
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/20'
                        : 'bg-zinc-900 text-slate-400 border-white/10 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Header Area: Score badge and Share button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-black text-emerald-400 text-xs sm:text-sm">
              <Zap size={14} fill="currentColor" />
              {score}
            </div>

            {currentMode === 'LIBRARY' && !isChallenge && (
              <button
                onClick={() => setShowShareModal(true)}
                className="p-1.5 sm:p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/20 rounded-full transition-all active:scale-90 shrink-0 shadow-lg"
                title="Bu Seti ve Skorunu Paylaş"
              >
                <Share2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Set Progress Bar */}
      <div className="w-full max-w-[340px] sm:max-w-sm mx-auto px-4 sm:px-6 mb-1 sm:mb-2 mt-0.5 relative z-10 shrink-0">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
          <span>İlerleyen: {currentIndex + 1} / {quizSet.length}</span>
          <span>SET {currentSetNum} / {totalSets} ({sortedWords.length})</span>
        </div>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/80 shadow-inner">
          <div 
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full shadow-[0_0_8px_#10b981]"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Question & Options Area */}
      <div className="flex-1 px-4 sm:px-6 flex flex-col justify-center max-w-lg mx-auto w-full relative z-10 min-h-0 pb-3 sm:pb-5">
        <div className="bg-zinc-900 rounded-[24px] sm:rounded-[36px] p-4 sm:p-6 md:p-7 border border-white/5 shadow-2xl mb-3 sm:mb-4 text-center relative overflow-hidden group shrink-0">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500/30 group-hover:h-2.5 transition-all"></div>
          <p className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] mb-1.5 sm:mb-2">
            {direction === LanguageDirection.TR_EN ? "İngilizce Karşılığı Nedir?" : "Türkçe Karşılığı Nedir?"}
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
            {direction === LanguageDirection.EN_TR ? currentWord?.english : currentWord?.turkish}
          </h2>
        </div>

        <div className="space-y-2 sm:space-y-2.5 w-full">
          {options.map((opt, idx) => {
            let btnClass = "w-full py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-2xl sm:rounded-[24px] text-center font-black text-base sm:text-lg transition-all border-2 flex items-center justify-center min-h-[46px] sm:min-h-[52px] md:min-h-[58px] ";
            const correct = direction === LanguageDirection.EN_TR ? currentWord.turkish : currentWord.english;

            if (showResult) {
              if (opt === correct) btnClass += "bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20 scale-[1.02]";
              else if (opt === selectedOption) btnClass += "bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20";
              else btnClass += "bg-zinc-900/50 border-white/5 text-slate-600 opacity-50";
            } else {
              btnClass += "bg-zinc-900 border-white/5 text-slate-400 hover:border-emerald-500/50 hover:text-white hover:bg-zinc-800 active:scale-[0.98]";
            }

            return <button key={idx} onClick={() => handleSelect(opt)} disabled={showResult} className={btnClass}>{opt}</button>;
          })}
        </div>
      </div>

      {/* Paylaş Modalı */}
      <QuizShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        challengeData={{
          level: currentLevel,
          setNum: currentSetNum,
          challengerScore: score,
          wordIds: activeIds
        }}
      />
    </div>
  );
};

export default QuizMode;
