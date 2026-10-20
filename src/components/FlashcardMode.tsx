import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Word, LanguageDirection, FlashcardStudyMode, LibraryLevel, WordProgressStatus } from '../types';
import { ArrowLeft, Volume2, Languages, Trophy, ChevronLeft, ChevronRight, Check, BookOpen, Puzzle, Sparkles, SlidersHorizontal, Tag, Home, Headphones, Play, Pause } from 'lucide-react';
import { wordService } from '../services/supabaseClient';
import { audioStudyService, AudioPhase } from '../services/audioStudyService';
import ListeningModeBar from './ListeningModeBar';
import confetti from 'canvas-confetti';

const FLASHCARD_SET_SIZE = 20;

const STORAGE_KEYS = {
    ACTIVE_IDS: 'lingua_flashcard_active_ids',
    CURRENT_INDEX: 'lingua_flashcard_current_index',
    SET_NUM: 'lingua_flashcard_set_num',
    DIRECTION: 'lingua_flashcard_direction',
} as const;

const getActiveIdsKey = (mode: FlashcardStudyMode, level: LibraryLevel) =>
    `${STORAGE_KEYS.ACTIVE_IDS}_${mode}_${level}`;

const getCurrentIndexKey = (mode: FlashcardStudyMode, level: LibraryLevel) =>
    `${STORAGE_KEYS.CURRENT_INDEX}_${mode}_${level}`;

const getSetNumKey = (mode: FlashcardStudyMode, level: LibraryLevel) =>
    `${STORAGE_KEYS.SET_NUM}_${mode}_${level}`;

interface FlashcardModeProps {
    words: Word[];
    studyMode: FlashcardStudyMode;
    selectedLevel: LibraryLevel;
    isLoading?: boolean;
    onLevelChange: (level: LibraryLevel) => void;
    onOpenModeSelection: () => void;
    onExit: () => void;
    onNextSet: () => void;
    onRemoveWord: (id: string) => void;
    onGoToQuiz?: () => void;
    onGoToSentences?: () => void;
    userId?: string;
}

const LEVELS: LibraryLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const FlashcardMode: React.FC<FlashcardModeProps> = ({
    words,
    studyMode,
    selectedLevel,
    isLoading = false,
    onLevelChange,
    onOpenModeSelection,
    onExit,
    onNextSet,
    onRemoveWord,
    onGoToQuiz,
    onGoToSentences,
    userId
}) => {
    const [activeIds, setActiveIds] = useState<string[]>(() => {
        const savedIdsJson = localStorage.getItem(getActiveIdsKey(studyMode, selectedLevel));
        if (savedIdsJson) {
            try {
                const savedIds = JSON.parse(savedIdsJson);
                if (Array.isArray(savedIds) && savedIds.length > 0) {
                    return savedIds;
                }
            } catch {}
        }
        return [];
    });

    const [currentSetNum, setCurrentSetNum] = useState<number>(() => {
        const saved = localStorage.getItem(getSetNumKey(studyMode, selectedLevel));
        if (saved) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        return 1;
    });

    const [currentIndex, setCurrentIndex] = useState<number>(() => {
        const saved = localStorage.getItem(getCurrentIndexKey(studyMode, selectedLevel));
        if (saved) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed >= 0) return parsed;
        }
        return 0;
    });

    const [isFlipped, setIsFlipped] = useState(false);
    const [isFinished, setIsFinished] = useState<boolean>(false);
    const [userProgressMap, setUserProgressMap] = useState<Record<string, WordProgressStatus>>({});

    const [direction, setDirection] = useState<LanguageDirection>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.DIRECTION);
        return (saved as LanguageDirection) || LanguageDirection.TR_EN;
    });

    const [isListeningMode, setIsListeningMode] = useState<boolean>(false);
    const [listeningPhase, setListeningPhase] = useState<AudioPhase>('front');
    const [remainingDelay, setRemainingDelay] = useState<number>(4);
    const [delaySeconds, setDelaySeconds] = useState<number>(4);
    const [isAudioPaused, setIsAudioPaused] = useState<boolean>(false);
    const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);

    const [libraryScope, setLibraryScope] = useState<'CORE_300' | 'ALL'>(() => {
        const saved = localStorage.getItem('lingua_flashcard_library_scope');
        return saved === 'ALL' ? 'ALL' : 'CORE_300';
    });

    useEffect(() => {
        wordService.getUserProgress(userId).then(setUserProgressMap);
    }, [userId]);

    const sortedWords = useMemo(() => {
        if (studyMode === 'LIBRARY') {
            return words.filter(w => !w.set_name || w.set_name.toUpperCase() === selectedLevel.toUpperCase());
        }
        return [...words]
            .filter(w => !w.is_archived && (!w.set_name || w.set_name === "Demo Kelimeler"))
            .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }, [words, studyMode, selectedLevel]);

    const scopedWords = useMemo(() => {
        if (studyMode === 'LIBRARY' && libraryScope === 'CORE_300') {
            return sortedWords.slice(0, 300);
        }
        return sortedWords;
    }, [studyMode, libraryScope, sortedWords]);

    const totalSets = Math.max(1, Math.ceil(scopedWords.length / FLASHCARD_SET_SIZE));

    const currentSet = useMemo(() => {
        if (activeIds.length > 0) {
            const mapped = activeIds
                .map(id => scopedWords.find(w => w.id === id))
                .filter((w): w is Word => !!w);
            if (mapped.length > 0) return mapped;
        }
        const setStart = (currentSetNum - 1) * FLASHCARD_SET_SIZE;
        return scopedWords.slice(setStart, setStart + FLASHCARD_SET_SIZE);
    }, [activeIds, scopedWords, currentSetNum]);

    const activeSessionRef = useRef({
        studyMode,
        selectedLevel,
        currentIndex,
        currentSetNum,
        activeIds
    });

    useEffect(() => {
        activeSessionRef.current = {
            studyMode,
            selectedLevel,
            currentIndex,
            currentSetNum,
            activeIds
        };
    }, [studyMode, selectedLevel, currentIndex, currentSetNum, activeIds]);

    const prevConfigRef = useRef({ studyMode, selectedLevel, currentSetNum });

    useEffect(() => {
        const prev = prevConfigRef.current;
        const modeOrLevelChanged = 
            prev.studyMode !== studyMode || 
            prev.selectedLevel !== selectedLevel;
        // setChanged SADECE aynı seviye ve mod içindeyken manuel yeni sete geçildiğinde tetiklenmeli
        const setChanged = !modeOrLevelChanged && prev.currentSetNum !== currentSetNum;

        if (modeOrLevelChanged) {
            // 1. Ayrılmakta olan seviyenin güncel currentIndex ve currentSetNum'ı o seviyenin anahtarlarına yazılmalı.
            const outgoingMode = prev.studyMode;
            const outgoingLevel = prev.selectedLevel;
            localStorage.setItem(getCurrentIndexKey(outgoingMode, outgoingLevel), activeSessionRef.current.currentIndex.toString());
            localStorage.setItem(getSetNumKey(outgoingMode, outgoingLevel), activeSessionRef.current.currentSetNum.toString());
            if (activeSessionRef.current.activeIds.length > 0) {
                localStorage.setItem(getActiveIdsKey(outgoingMode, outgoingLevel), JSON.stringify(activeSessionRef.current.activeIds));
            }

            // 2. Yeni seçilen seviyenin kayıtlı savedIndex, savedSet ve savedActiveIds değerleri yüklenmeli.
            const savedIndex = localStorage.getItem(getCurrentIndexKey(studyMode, selectedLevel));
            const parsedIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
            const targetIndex = !isNaN(parsedIndex) && parsedIndex >= 0 ? parsedIndex : 0;

            const savedSet = localStorage.getItem(getSetNumKey(studyMode, selectedLevel));
            const parsedSet = savedSet ? parseInt(savedSet, 10) : 1;
            const targetSet = !isNaN(parsedSet) && parsedSet > 0 ? parsedSet : 1;

            // prevConfigRef'i YENİ targetSet ile güncelle ki sonraki render'da sahte setChanged tetiklenmesin
            prevConfigRef.current = { studyMode, selectedLevel, currentSetNum: targetSet };

            setCurrentIndex(targetIndex);
            setCurrentSetNum(targetSet);
            setIsFinished(false);
            setIsFlipped(false);

            if (studyMode === 'LIBRARY') {
                localStorage.setItem('lingua_flashcard_last_level', selectedLevel);
            }

            // 3. activeIds state'i yeni seviyenin kelimeleriyle senkronize edilmeli
            if (scopedWords.length === 0) {
                return;
            }

            const savedIdsJson = localStorage.getItem(getActiveIdsKey(studyMode, selectedLevel));
            let targetActiveIds: string[] = [];
            if (savedIdsJson) {
                try {
                    const savedIds = JSON.parse(savedIdsJson);
                    if (Array.isArray(savedIds) && savedIds.length > 0) {
                        const validIds = savedIds.filter((id: string) => sortedWords.some(w => w.id === id) && scopedWords.some(w => w.id === id));
                        if (validIds.length > 0) {
                            targetActiveIds = validIds;
                        }
                    }
                } catch {}
            }

            if (targetActiveIds.length === 0) {
                const setStart = (targetSet - 1) * FLASHCARD_SET_SIZE;
                const setEnd = Math.min(setStart + FLASHCARD_SET_SIZE, scopedWords.length);
                const setWords = scopedWords.slice(setStart, setEnd);
                if (setWords.length > 0) {
                    targetActiveIds = setWords.map(w => w.id);
                    localStorage.setItem(getActiveIdsKey(studyMode, selectedLevel), JSON.stringify(targetActiveIds));
                }
            }

            setActiveIds(targetActiveIds);
            return;
        }

        prevConfigRef.current = { studyMode, selectedLevel, currentSetNum };

        if (setChanged) {
            setCurrentIndex(0);
            setIsFinished(false);
            setIsFlipped(false);
        }

        if (scopedWords.length === 0) {
            return;
        }

        // If mode and level did not change and we already have activeIds, keep them (filtering out any removed IDs)
        if (activeIds.length > 0) {
            const currentValidIds = activeIds.filter(id => scopedWords.some(w => w.id === id));
            if (currentValidIds.length !== activeIds.length) {
                setActiveIds(currentValidIds);
                localStorage.setItem(getActiveIdsKey(studyMode, selectedLevel), JSON.stringify(currentValidIds));
            }
            return;
        }

        // If activeIds is empty: check localStorage first
        const savedIdsJson = localStorage.getItem(getActiveIdsKey(studyMode, selectedLevel));
        if (savedIdsJson) {
            try {
                const savedIds = JSON.parse(savedIdsJson);
                if (Array.isArray(savedIds) && savedIds.length > 0) {
                    const validIds = savedIds.filter((id: string) => scopedWords.some(w => w.id === id));
                    if (validIds.length > 0) {
                        setActiveIds(validIds);
                        return;
                    }
                }
            } catch {}
        }

        const setStart = (currentSetNum - 1) * FLASHCARD_SET_SIZE;
        const setEnd = Math.min(setStart + FLASHCARD_SET_SIZE, scopedWords.length);
        const setWords = scopedWords.slice(setStart, setEnd);

        if (setWords.length > 0) {
            const newIds = setWords.map(w => w.id);
            localStorage.setItem(getActiveIdsKey(studyMode, selectedLevel), JSON.stringify(newIds));
            setActiveIds(newIds);
        }
    }, [scopedWords, currentSetNum, studyMode, selectedLevel]);

    const safeIndex = currentIndex >= currentSet.length ? Math.max(0, currentSet.length - 1) : currentIndex;
    const currentWord = currentSet.length > 0 ? currentSet[safeIndex] : null;

    useEffect(() => {
        if (currentSet.length > 0 && currentIndex >= currentSet.length) {
            setCurrentIndex(Math.max(0, currentSet.length - 1));
        }
    }, [currentSet.length, currentIndex]);

    useEffect(() => {
        if (prevConfigRef.current.studyMode === studyMode && prevConfigRef.current.selectedLevel === selectedLevel) {
            localStorage.setItem(getCurrentIndexKey(studyMode, selectedLevel), currentIndex.toString());
        }
    }, [currentIndex, studyMode, selectedLevel]);

    useEffect(() => {
        if (prevConfigRef.current.studyMode === studyMode && prevConfigRef.current.selectedLevel === selectedLevel) {
            localStorage.setItem(getSetNumKey(studyMode, selectedLevel), currentSetNum.toString());
        }
    }, [currentSetNum, studyMode, selectedLevel]);

    useEffect(() => {
        setIsFlipped(false);
    }, [currentIndex]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.DIRECTION, direction);
    }, [direction]);

    useEffect(() => {
        return () => {
            audioStudyService.cleanup();
            window.speechSynthesis.cancel();
            // Save current session progress on unmount
            const current = activeSessionRef.current;
            localStorage.setItem(getCurrentIndexKey(current.studyMode, current.selectedLevel), current.currentIndex.toString());
            localStorage.setItem(getSetNumKey(current.studyMode, current.selectedLevel), current.currentSetNum.toString());
            if (current.activeIds.length > 0) {
                localStorage.setItem(getActiveIdsKey(current.studyMode, current.selectedLevel), JSON.stringify(current.activeIds));
            }
        };
    }, []);

    useEffect(() => {
        if (!currentWord || isListeningMode) return;
        const isEnglishVisible = (direction === LanguageDirection.EN_TR && !isFlipped) ||
                                 (direction === LanguageDirection.TR_EN && isFlipped);
        if (isEnglishVisible) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(currentWord.english);
            u.lang = 'en-US';
            u.rate = 0.9;
            window.speechSynthesis.speak(u);
        }
    }, [currentIndex, isFlipped, direction, currentWord, isListeningMode]);

    const triggerSuccessConfetti = () => {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    };

    const handleToggleListeningMode = () => {
        if (isListeningMode) {
            audioStudyService.stop();
            setIsListeningMode(false);
            setIsAudioPaused(false);
        } else {
            if (currentSet.length === 0) return;
            setIsListeningMode(true);
            setIsAudioPaused(false);
            setListeningPhase('front');
            setRemainingDelay(delaySeconds);

            audioStudyService.startListeningSession({
                words: currentSet,
                startIndex: currentIndex,
                direction,
                delaySeconds,
                callbacks: {
                    onWordChange: (idx, word, phase) => {
                        if (phase === 'front') {
                            setCurrentIndex(idx);
                            setIsFlipped(false);
                        } else if (phase === 'back') {
                            setIsFlipped(true);
                        } else if (phase === 'transition') {
                            setIsFlipped(false);
                        }
                        setListeningPhase(phase);
                    },
                    onStateChange: (playing, phase, remaining) => {
                        setIsAudioPaused(!playing);
                        setListeningPhase(phase);
                        if (remaining !== undefined) {
                            setRemainingDelay(remaining);
                        }
                    },
                    onComplete: () => {
                        setIsListeningMode(false);
                        setIsFinished(true);
                        setAutoAdvanceCountdown(10);
                        triggerSuccessConfetti();
                    }
                }
            });
        }
    };

    const handleDelayChange = (seconds: number) => {
        setDelaySeconds(seconds);
        audioStudyService.setDelaySeconds(seconds);
    };

    const handleAudioTogglePlayPause = () => {
        if (isAudioPaused) {
            audioStudyService.resume();
        } else {
            audioStudyService.pause();
        }
    };

    const handleAudioNext = () => {
        if (isFlipped) {
            setIsFlipped(false);
            setTimeout(() => {
                audioStudyService.next();
            }, 300);
        } else {
            audioStudyService.next();
        }
    };

    const handleAudioPrev = () => {
        if (isFlipped) {
            setIsFlipped(false);
            setTimeout(() => {
                audioStudyService.prev();
            }, 300);
        } else {
            audioStudyService.prev();
        }
    };

    const handleCloseListening = () => {
        audioStudyService.stop();
        setIsListeningMode(false);
        setIsAudioPaused(false);
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const doNext = () => {
            if (currentIndex < currentSet.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setIsFinished(true);
                triggerSuccessConfetti();
            }
        };

        if (isFlipped) {
            setIsFlipped(false);
            setTimeout(doNext, 300);
        } else {
            doNext();
        }
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const handleSetProgressStatus = (e: React.MouseEvent, status: WordProgressStatus) => {
        e.stopPropagation();
        if (!currentWord) return;

        const currentWordId = currentWord.id;
        setUserProgressMap(prev => ({ ...prev, [currentWordId]: status }));
        wordService.saveUserProgress(currentWordId, status, userId);

        if (status === 'known' && studyMode === 'USER_WORDS') {
            const updatedActiveIds = activeIds.filter(id => id !== currentWordId);
            
            localStorage.setItem(getActiveIdsKey(studyMode, selectedLevel), JSON.stringify(updatedActiveIds));
            setActiveIds(updatedActiveIds);
            onRemoveWord(currentWordId);

            const isLastCard = currentIndex >= currentSet.length - 1;

            const doAdvanceOrFinish = () => {
                if (updatedActiveIds.length === 0 || (isLastCard && currentIndex >= updatedActiveIds.length)) {
                    setIsFinished(true);
                    triggerSuccessConfetti();
                } else if (currentIndex >= updatedActiveIds.length) {
                    const newIdx = Math.max(0, updatedActiveIds.length - 1);
                    setCurrentIndex(newIdx);
                    localStorage.setItem(getCurrentIndexKey(studyMode, selectedLevel), newIdx.toString());
                }
            };

            if (isFlipped) {
                setIsFlipped(false);
                setTimeout(doAdvanceOrFinish, 300);
            } else {
                doAdvanceOrFinish();
            }
        } else {
            handleNext();
        }
    };

    const handleNewSet = (resumeListening: boolean = false) => {
        setAutoAdvanceCountdown(null);
        const nextSetNum = currentSetNum < totalSets ? currentSetNum + 1 : 1;
        localStorage.removeItem(getActiveIdsKey(studyMode, selectedLevel));
        localStorage.setItem(getCurrentIndexKey(studyMode, selectedLevel), '0');
        localStorage.setItem(getSetNumKey(studyMode, selectedLevel), nextSetNum.toString());
        setActiveIds([]);
        setCurrentIndex(0);
        setCurrentSetNum(nextSetNum);
        setIsFlipped(false);
        setIsFinished(false);
        onNextSet();

        if (resumeListening) {
            setTimeout(() => {
                const nextSetStart = (nextSetNum - 1) * FLASHCARD_SET_SIZE;
                const nextWords = scopedWords.slice(nextSetStart, nextSetStart + FLASHCARD_SET_SIZE);
                if (nextWords.length > 0) {
                    setIsListeningMode(true);
                    setIsAudioPaused(false);
                    setListeningPhase('front');
                    setRemainingDelay(delaySeconds);

                    audioStudyService.startListeningSession({
                        words: nextWords,
                        startIndex: 0,
                        direction,
                        delaySeconds,
                        callbacks: {
                            onWordChange: (idx, word, phase) => {
                                if (phase === 'front') {
                                    setCurrentIndex(idx);
                                    setIsFlipped(false);
                                } else if (phase === 'back') {
                                    setIsFlipped(true);
                                } else if (phase === 'transition') {
                                    setIsFlipped(false);
                                }
                                setListeningPhase(phase);
                            },
                            onStateChange: (playing, phase, remaining) => {
                                setIsAudioPaused(!playing);
                                setListeningPhase(phase);
                                if (remaining !== undefined) {
                                    setRemainingDelay(remaining);
                                }
                            },
                            onComplete: () => {
                                setIsListeningMode(false);
                                setIsFinished(true);
                                setAutoAdvanceCountdown(10);
                                triggerSuccessConfetti();
                            }
                        }
                    });
                }
            }, 100);
        }
    };

    useEffect(() => {
        if (autoAdvanceCountdown === null || !isFinished) return;

        if (autoAdvanceCountdown <= 0) {
            handleNewSet(true);
            return;
        }

        const timer = setTimeout(() => {
            setAutoAdvanceCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearTimeout(timer);
    }, [autoAdvanceCountdown, isFinished]);

    const handleLevelTabClick = (lvl: LibraryLevel) => {
        if (lvl === selectedLevel) return;
        handleCloseListening();
        // 1. Ayrılmakta olan seviyenin güncel currentIndex ve currentSetNum'ı o seviyenin anahtarlarına yazılmalı.
        localStorage.setItem(getCurrentIndexKey(studyMode, selectedLevel), currentIndex.toString());
        localStorage.setItem(getSetNumKey(studyMode, selectedLevel), currentSetNum.toString());
        if (activeIds.length > 0) {
            localStorage.setItem(getActiveIdsKey(studyMode, selectedLevel), JSON.stringify(activeIds));
        }
        onLevelChange(lvl);
    };

    const handleScopeChange = (newScope: 'CORE_300' | 'ALL') => {
        if (newScope === libraryScope) return;
        handleCloseListening();
        setLibraryScope(newScope);
        localStorage.setItem('lingua_flashcard_library_scope', newScope);
        setCurrentIndex(0);
        setCurrentSetNum(1);
        setActiveIds([]);
        setIsFlipped(false);
        setIsFinished(false);
    };

    const speak = (e: React.MouseEvent, text: string, lang: 'en-US' | 'tr-TR') => {
        e.stopPropagation();
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
    };

    if (isFinished) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center font-['Plus_Jakarta_Sans']">
                <div className="bg-zinc-900 border border-yellow-500/20 p-12 rounded-[56px] shadow-2xl w-full max-w-sm relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl"></div>
                    <Trophy size={72} className="text-yellow-500 mx-auto mb-6 animate-bounce" />
                    <h2 className="text-4xl font-black text-white mb-2">Harika Bir Set!</h2>
                    <p className="text-slate-500 font-bold mb-6">Bu gruptaki tüm kelimeleri inceledin.</p>

                    {autoAdvanceCountdown !== null && (
                        <div className="mb-6 p-4 rounded-3xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col items-center gap-2">
                            <div className="flex items-center gap-2 text-emerald-400 font-black text-xs sm:text-sm">
                                <Headphones size={16} className="animate-pulse" />
                                <span>Dinleme Modu: <b>{autoAdvanceCountdown}s</b> sonra yeni sete geçiliyor</span>
                            </div>
                            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                <div 
                                    className="bg-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
                                    style={{ width: `${(autoAdvanceCountdown / 10) * 100}%` }}
                                />
                            </div>
                            <button
                                onClick={() => setAutoAdvanceCountdown(null)}
                                className="text-[11px] text-slate-400 hover:text-white font-bold underline transition-colors mt-1"
                            >
                                ⏸️ Otomatik Geçişi Durdur / İptal Et
                            </button>
                        </div>
                    )}

                    <div className="space-y-3 w-full">
                        <button
                            onClick={() => handleNewSet(autoAdvanceCountdown !== null)}
                            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded-3xl font-black text-base hover:scale-105 transition-all shadow-xl shadow-yellow-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <BookOpen size={18} /> {autoAdvanceCountdown !== null ? 'Hemen Yeni Sete Geç' : 'Yeni Set ile Devam Et'}
                        </button>

                        <button
                            onClick={() => {
                                setAutoAdvanceCountdown(null);
                                onOpenModeSelection();
                            }}
                            className="w-full py-4 bg-purple-600/10 text-purple-400 border border-purple-500/20 rounded-3xl font-black text-base hover:bg-purple-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <SlidersHorizontal size={18} /> Başka Moda Geç
                        </button>

                        {onGoToQuiz && (
                            <button
                                onClick={() => {
                                    setAutoAdvanceCountdown(null);
                                    onGoToQuiz();
                                }}
                                className="w-full py-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-3xl font-black text-base hover:bg-emerald-500 hover:text-black transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Puzzle size={18} /> Test Çöz
                            </button>
                        )}

                        <button
                            onClick={() => {
                                setAutoAdvanceCountdown(null);
                                onExit();
                            }}
                            className="w-full py-4 bg-zinc-900 text-slate-400 rounded-3xl font-black text-base border border-white/5 active:scale-95 transition-all hover:text-white"
                        >
                            Dashboard'a Dön
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isFrontTR = direction === LanguageDirection.TR_EN;
    const isLevelTransitioning = studyMode === 'LIBRARY' && words.length > 0 && !words.some(w => !w.set_name || w.set_name.toUpperCase() === selectedLevel.toUpperCase());
    const isLevelLoading = Boolean(isLoading) || isLevelTransitioning;

    return (
        <div className="min-h-screen bg-black flex flex-col text-white font-['Plus_Jakarta_Sans']">
            {/* Top Header - Always visible */}
            <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 md:px-10 py-2.5 sm:py-4 relative z-50">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-1.5 sm:gap-4 w-full">
                    <button 
                        onClick={onExit} 
                        className="p-2 sm:p-3 bg-zinc-900 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5 shadow-lg flex items-center gap-1.5 sm:gap-2 justify-self-start shrink-0"
                        title="Dashboard'a Dön"
                    >
                        <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline text-xs font-bold">Ana Sayfa</span>
                    </button>

                    {/* Center Column: Mod Buttons + Level Tabs + Scope Selector centered */}
                    <div className="flex flex-col items-center gap-1.5 sm:gap-2.5 justify-self-center max-w-full min-w-0">
                        {/* Mode / Action Buttons */}
                        <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-nowrap max-w-full">
                            <button
                                onClick={handleToggleListeningMode}
                                className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full font-black text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition-all shadow-lg active:scale-95 shrink-0 ${
                                    isListeningMode
                                        ? 'bg-emerald-500 text-black shadow-emerald-500/30 animate-pulse'
                                        : 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                                }`}
                                title="Arka planda ve kilit ekranında dinleme modu"
                            >
                                <Headphones size={13} className="sm:w-3.5 sm:h-3.5" />
                                <span>{isListeningMode ? 'Dinleniyor' : 'Dinleme Modu'}</span>
                            </button>
                            <button
                                onClick={() => {
                                    handleCloseListening();
                                    onOpenModeSelection();
                                }}
                                className="bg-purple-600/20 border border-purple-500/30 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-purple-300 font-black text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 hover:bg-purple-600 hover:text-white transition-all shrink-0"
                            >
                                <SlidersHorizontal size={13} className="sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Mod Seç</span>
                            </button>
                            <button
                                onClick={() => {
                                    handleCloseListening();
                                    setDirection(d => d === LanguageDirection.EN_TR ? LanguageDirection.TR_EN : LanguageDirection.EN_TR);
                                }}
                                className="bg-zinc-900 border border-white/10 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full text-slate-400 font-black text-[10px] sm:text-xs tracking-wider sm:tracking-widest uppercase flex items-center gap-1 sm:gap-1.5 hover:text-white transition-all shadow-xl shrink-0"
                            >
                                <Languages size={13} className="sm:w-3.5 sm:h-3.5" /> {direction === LanguageDirection.TR_EN ? 'TR → EN' : 'EN → TR'}
                            </button>
                        </div>

                        {/* Level Tabs & Scope Selector for Library Mode - Centered under mode buttons */}
                        {studyMode === 'LIBRARY' && (
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2.5 w-full">
                                <div className="flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-full py-0.5">
                                    {LEVELS.map(lvl => (
                                        <button
                                            key={lvl}
                                            onClick={() => handleLevelTabClick(lvl)}
                                            className={`px-2.5 py-1 sm:px-3.5 sm:py-1 rounded-full font-black text-[10px] sm:text-xs transition-all border shrink-0 ${
                                                selectedLevel === lvl
                                                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/20'
                                                    : 'bg-zinc-900 text-slate-400 border-white/10 hover:border-white/30 hover:text-white'
                                            }`}
                                        >
                                            {lvl}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center justify-center gap-0.5 bg-zinc-900/90 border border-white/10 p-0.5 rounded-full shrink-0 shadow-inner">
                                    <button
                                        onClick={() => handleScopeChange('CORE_300')}
                                        className={`px-2 sm:px-2.5 py-0.5 rounded-full font-black text-[9px] sm:text-[10px] transition-all flex items-center gap-1 ${
                                            libraryScope === 'CORE_300'
                                                ? 'bg-amber-400 text-black shadow-md'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                        title="Seviyenin en temel ve sık kullanılan ilk 300 kelimesi"
                                    >
                                        <span>⭐ Temel 300</span>
                                    </button>
                                    <button
                                        onClick={() => handleScopeChange('ALL')}
                                        className={`px-2 sm:px-2.5 py-0.5 rounded-full font-black text-[9px] sm:text-[10px] transition-all flex items-center gap-1 ${
                                            libraryScope === 'ALL'
                                                ? 'bg-blue-500 text-white shadow-md'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                        title="Tüm kelime havuzu (1000+)"
                                    >
                                        <span>📚 Tümü ({sortedWords.length || '1000+'})</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => {
                            handleCloseListening();
                            onExit();
                        }} 
                        className="p-2 sm:p-3 bg-zinc-900 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5 shadow-lg justify-self-end shrink-0"
                        title="Ana Sayfa"
                    >
                        <Home size={18} className="sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>

            {/* Loading / Transition State - Guard against flickering empty state during tab switches */}
            {isLevelLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center">
                    <div className="bg-zinc-900 border border-white/5 p-8 md:p-10 rounded-[40px] w-full max-w-sm flex flex-col items-center justify-center min-h-[280px] shadow-2xl">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                            <BookOpen size={28} className="text-blue-400 animate-pulse" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">Yükleniyor...</h3>
                        <p className="text-slate-400 text-xs font-bold">
                            {selectedLevel} seviyesi kelimeleri hazırlanıyor
                        </p>
                    </div>
                </div>
            ) : !currentWord ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center">
                    <div className="bg-zinc-900 border border-white/10 p-8 md:p-10 rounded-[40px] w-full shadow-2xl">
                        <BookOpen size={56} className="text-blue-500 mx-auto mb-4 animate-pulse" />
                        <h3 className="text-2xl font-black text-white mb-2">
                            {studyMode === 'LIBRARY' ? `${selectedLevel} Seviyesinde Kelime Bulunamadı` : 'Kelimeleriniz Bulunamadı'}
                        </h3>
                        <p className="text-slate-400 text-sm font-bold mb-8 leading-relaxed">
                            {studyMode === 'LIBRARY'
                                ? `${selectedLevel} seviyesinde henüz kelime bulunmuyor. Yukarıdaki sekmelerden diğer seviyelere geçebilir ya da başka bir mod seçebilirsiniz.`
                                : 'Kelime listeniz henüz boş. AI ile yeni kelimeler ekleyebilir veya Kütüphane modundan çalışabilirsiniz.'}
                        </p>
                        
                        <div className="space-y-3 w-full">
                            {studyMode === 'LIBRARY' && selectedLevel !== 'A1' && (
                                <button
                                    onClick={() => onLevelChange('A1')}
                                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={18} /> Hazır Seviyelere Dön (A1)
                                </button>
                            )}

                            <button
                                onClick={onOpenModeSelection}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95"
                            >
                                Mod Seçimine Dön
                            </button>

                            <button
                                onClick={onExit}
                                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-slate-300 rounded-2xl font-black text-sm transition-all border border-white/10 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Home size={18} /> Ana Sayfaya Dön
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Listening Mode Floating/Docked Player Bar */}
                    {isListeningMode && (
                        <ListeningModeBar
                            currentIndex={currentIndex}
                            totalWords={currentSet.length}
                            isPlaying={!isAudioPaused}
                            isPaused={isAudioPaused}
                            phase={listeningPhase}
                            remainingDelay={remainingDelay}
                            delaySeconds={delaySeconds}
                            onTogglePlayPause={handleAudioTogglePlayPause}
                            onNext={handleAudioNext}
                            onPrev={handleAudioPrev}
                            onClose={handleCloseListening}
                            onDelayChange={handleDelayChange}
                        />
                    )}

                    {/* Set Progress Bar */}
                    <div className="w-full max-w-[340px] sm:max-w-sm mx-auto px-4 sm:px-6 mb-1 sm:mb-1.5 mt-0.5">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                            <span>İlerleyen: {currentIndex + 1} / {currentSet.length}</span>
                            <span>SET {currentSetNum} / {totalSets} ({scopedWords.length})</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                            <div 
                                className="h-full bg-blue-500 transition-all duration-300 rounded-full shadow-[0_0_8px_#3b82f6]"
                                style={{ width: `${((currentIndex + 1) / (currentSet.length || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Main Flashcard */}
                    <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-1 w-full max-w-[340px] sm:max-w-[360px] mx-auto relative">
                        <div className="w-full aspect-[4/4.8] max-h-[38vh] sm:max-h-[46vh] min-h-[250px] sm:min-h-[290px] cursor-pointer perspective-1000 group" onClick={() => setIsFlipped(!isFlipped)}>
                            <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

                                {/* ÖN YÜZ */}
                                <div className={`absolute inset-0 backface-hidden rounded-[28px] sm:rounded-[40px] flex flex-col items-center justify-between p-4 sm:p-6 shadow-2xl ${isFrontTR ? 'bg-zinc-900 text-white border-2 border-zinc-800' : 'bg-yellow-400 text-black'}`}>
                                    <div className="w-full flex items-center justify-between">
                                        <span className={`font-black uppercase tracking-[0.2em] text-[10px] ${isFrontTR ? 'text-slate-500' : 'text-black/50'}`}>
                                            {isFrontTR ? 'TURKISH' : 'ENGLISH'}
                                        </span>
                                        {(currentWord.word_type || currentWord.category) && (
                                            <div className="flex items-center gap-1.5">
                                                {currentWord.word_type && (
                                                    <span className={`px-2 py-0.5 rounded-md font-extrabold text-[9px] uppercase tracking-wider ${isFrontTR ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-black/15 text-black'}`}>
                                                        {currentWord.word_type}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-center justify-center my-auto w-full">
                                        {!isFrontTR && (
                                            <button
                                                onClick={(e) => speak(e, currentWord.english, 'en-US')}
                                                className="mb-1 p-2 sm:p-2.5 rounded-2xl bg-black/5 text-black/50 hover:bg-black/10 transition-all active:scale-90 hover:text-black"
                                            >
                                                <Volume2 size={22} className="sm:w-6 sm:h-6" />
                                            </button>
                                        )}
                                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-center mb-1.5 sm:mb-2 tracking-tight leading-snug">{isFrontTR ? currentWord.turkish : currentWord.english}</h2>

                                        {currentWord.category && (
                                            <span className={`text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-1.5 sm:mb-2 flex items-center gap-1 opacity-80 ${isFrontTR ? 'bg-zinc-800 text-blue-300' : 'bg-black/10 text-black/80'}`}>
                                                <Tag size={10} /> {currentWord.category}
                                            </span>
                                        )}

                                        {(isFrontTR ? currentWord.turkish_sentence : currentWord.example_sentence) && (
                                            <p className="text-center text-[11px] sm:text-xs font-bold italic px-2 leading-relaxed opacity-75 line-clamp-2">
                                                "{isFrontTR ? currentWord.turkish_sentence : currentWord.example_sentence}"
                                            </p>
                                        )}
                                    </div>

                                    <div className="w-full flex flex-col items-center gap-2 sm:gap-2.5">
                                        <span className={`text-[9px] font-black tracking-widest animate-blink ${isFrontTR ? 'text-blue-400' : 'text-black/50'}`}>
                                            ÇEVİRİ İÇİN TIKLA
                                        </span>

                                        <div className="flex items-center justify-center gap-2 w-full">
                                            <button
                                                onClick={(e) => handleSetProgressStatus(e, 'known')}
                                                className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 ${
                                                    userProgressMap[currentWord.id] === 'known'
                                                        ? 'bg-emerald-500 text-white shadow-lg'
                                                        : isFrontTR ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white' : 'bg-black/10 text-black border border-black/10 hover:bg-black hover:text-white'
                                                }`}
                                            >
                                                <Check size={11} strokeWidth={3} /> Öğrendim
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* ARKA YÜZ */}
                                <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-[28px] sm:rounded-[40px] flex flex-col items-center justify-between p-4 sm:p-6 shadow-2xl ${isFrontTR ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-white border-2 border-zinc-800'}`}>
                                    <div className="w-full flex items-center justify-between">
                                        <span className={`font-black uppercase tracking-[0.2em] text-[10px] ${isFrontTR ? 'text-black/50' : 'text-slate-500'}`}>
                                            {isFrontTR ? 'ENGLISH' : 'TURKISH'}
                                        </span>
                                        {currentWord.word_type && (
                                            <span className={`px-2 py-0.5 rounded-md font-extrabold text-[9px] uppercase tracking-wider ${isFrontTR ? 'bg-black/15 text-black' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}`}>
                                                {currentWord.word_type}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-center justify-center my-auto w-full">
                                        {isFrontTR && (
                                            <button
                                                onClick={(e) => speak(e, currentWord.english, 'en-US')}
                                                className="mb-1 p-2 sm:p-2.5 rounded-2xl bg-black/5 text-black/50 hover:bg-black/10 transition-all active:scale-90 hover:text-black"
                                            >
                                                <Volume2 size={22} className="sm:w-6 sm:h-6" />
                                            </button>
                                        )}
                                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-center mb-1.5 sm:mb-2 tracking-tight leading-snug">{isFrontTR ? currentWord.english : currentWord.turkish}</h2>

                                        {currentWord.category && (
                                            <span className={`text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 rounded-full mb-1.5 sm:mb-2 flex items-center gap-1 opacity-80 ${isFrontTR ? 'bg-black/10 text-black/80' : 'bg-zinc-800 text-blue-300'}`}>
                                                <Tag size={10} /> {currentWord.category}
                                            </span>
                                        )}

                                        {(isFrontTR ? currentWord.example_sentence : currentWord.turkish_sentence) && (
                                            <p className="text-center text-[11px] sm:text-xs font-bold italic px-2 leading-relaxed opacity-75 line-clamp-2">
                                                "{isFrontTR ? currentWord.example_sentence : currentWord.turkish_sentence}"
                                            </p>
                                        )}
                                    </div>

                                    <div className="w-full flex flex-col items-center gap-2 sm:gap-2.5">
                                        <span className={`text-[9px] font-black tracking-widest animate-blink ${isFrontTR ? 'text-black/50' : 'text-blue-400'}`}>
                                            KELİMEYE DÖN
                                        </span>

                                        <div className="flex items-center justify-center gap-2 w-full">
                                            <button
                                                onClick={(e) => handleSetProgressStatus(e, 'known')}
                                                className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 ${
                                                    userProgressMap[currentWord.id] === 'known'
                                                        ? 'bg-emerald-500 text-white shadow-lg'
                                                        : isFrontTR ? 'bg-black/10 text-black border border-black/10 hover:bg-black hover:text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                                                }`}
                                            >
                                                <Check size={11} strokeWidth={3} /> Öğrendim
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Controls */}
                        <div className="mt-2.5 sm:mt-4 w-full flex justify-center items-center gap-2 sm:gap-3 pb-2 sm:pb-0">
                            {currentIndex > 0 ? (
                                <>
                                    <button
                                        onClick={handlePrev}
                                        className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-zinc-900 text-slate-400 hover:text-white border border-white/5 transition-all active:scale-90 shadow-xl shrink-0"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-black rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-white/5 min-w-[120px] sm:min-w-[130px]"
                                    >
                                        Sıradaki <ChevronRight size={16} />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    className="w-full max-w-[160px] sm:max-w-[200px] py-2.5 sm:py-3 bg-white text-black rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-white/5"
                                >
                                    Sıradaki <ChevronRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FlashcardMode;
