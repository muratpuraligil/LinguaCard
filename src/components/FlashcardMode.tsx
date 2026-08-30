import React, { useState, useEffect, useMemo } from 'react';
import { Word, LanguageDirection, FlashcardStudyMode, LibraryLevel, WordProgressStatus } from '../types';
import { ArrowLeft, Volume2, Languages, Trophy, ChevronLeft, ChevronRight, Check, BookOpen, Puzzle, Sparkles, SlidersHorizontal, Tag, Home } from 'lucide-react';
import { wordService } from '../services/supabaseClient';
import confetti from 'canvas-confetti';

const FLASHCARD_SET_SIZE = 20;

interface FlashcardModeProps {
    words: Word[];
    studyMode: FlashcardStudyMode;
    selectedLevel: LibraryLevel;
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
        const savedIdsJson = localStorage.getItem(`lingua_flashcard_active_ids_${studyMode}_${selectedLevel}`);
        if (savedIdsJson) {
            try {
                const savedIds = JSON.parse(savedIdsJson);
                if (Array.isArray(savedIds) && savedIds.length > 0) {
                    return savedIds;
                }
            } catch (e) {
                console.error("Failed to parse saved flashcard set IDs", e);
            }
        }
        return [];
    });

    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [currentSetNum, setCurrentSetNum] = useState<number>(1);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isFinished, setIsFinished] = useState<boolean>(false);
    const [userProgressMap, setUserProgressMap] = useState<Record<string, WordProgressStatus>>({});

    const [direction, setDirection] = useState<LanguageDirection>(() => {
        const saved = localStorage.getItem('lingua_flashcard_direction');
        return (saved as LanguageDirection) || LanguageDirection.TR_EN;
    });

    useEffect(() => {
        wordService.getUserProgress(userId).then(setUserProgressMap);
    }, [userId]);

    const sortedWords = useMemo(() => {
        if (studyMode === 'LIBRARY') {
            return words;
        }
        return [...words]
            .filter(w => !w.is_archived && (!w.set_name || w.set_name === "Demo Kelimeler"))
            .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }, [words, studyMode]);

    const totalSets = Math.max(1, Math.ceil(sortedWords.length / FLASHCARD_SET_SIZE));

    const currentSet = useMemo(() => {
        if (activeIds.length > 0) {
            const mapped = activeIds
                .map(id => sortedWords.find(w => w.id === id))
                .filter((w): w is Word => !!w);
            if (mapped.length > 0) return mapped;
        }
        return sortedWords.slice(0, FLASHCARD_SET_SIZE);
    }, [activeIds, sortedWords]);

    const prevConfigRef = React.useRef({ studyMode, selectedLevel, currentSetNum });

    useEffect(() => {
        const prev = prevConfigRef.current;
        const configChanged = 
            prev.studyMode !== studyMode || 
            prev.selectedLevel !== selectedLevel || 
            prev.currentSetNum !== currentSetNum;

        prevConfigRef.current = { studyMode, selectedLevel, currentSetNum };

        if (configChanged) {
            setCurrentIndex(0);
            setIsFinished(false);
            setIsFlipped(false);
        }

        if (sortedWords.length === 0) {
            setActiveIds([]);
            return;
        }

        // If config did not change and we already have activeIds, keep them (filtering out any removed IDs)
        if (!configChanged && activeIds.length > 0) {
            const currentValidIds = activeIds.filter(id => sortedWords.some(w => w.id === id));
            if (currentValidIds.length !== activeIds.length) {
                setActiveIds(currentValidIds);
                localStorage.setItem(`lingua_flashcard_active_ids_${studyMode}_${selectedLevel}`, JSON.stringify(currentValidIds));
            }
            return;
        }

        // If config changed or activeIds is empty: check localStorage first
        const savedIdsJson = localStorage.getItem(`lingua_flashcard_active_ids_${studyMode}_${selectedLevel}`);
        if (savedIdsJson) {
            try {
                const savedIds = JSON.parse(savedIdsJson);
                if (Array.isArray(savedIds) && savedIds.length > 0) {
                    const validIds = savedIds.filter((id: string) => sortedWords.some(w => w.id === id));
                    if (validIds.length > 0) {
                        setActiveIds(validIds);
                        return;
                    }
                }
            } catch (e) {
                console.error("Failed to parse saved flashcard set IDs", e);
            }
        }

        const setStart = (currentSetNum - 1) * FLASHCARD_SET_SIZE;
        const setEnd = Math.min(setStart + FLASHCARD_SET_SIZE, sortedWords.length);
        const setWords = sortedWords.slice(setStart, setEnd);

        if (setWords.length > 0) {
            const shuffled = [...setWords].sort(() => Math.random() - 0.5);
            const newIds = shuffled.map(w => w.id);
            localStorage.setItem(`lingua_flashcard_active_ids_${studyMode}_${selectedLevel}`, JSON.stringify(newIds));
            setActiveIds(newIds);
        }
    }, [sortedWords, currentSetNum, studyMode, selectedLevel]);

    const safeIndex = currentIndex >= currentSet.length ? Math.max(0, currentSet.length - 1) : currentIndex;
    const currentWord = currentSet.length > 0 ? currentSet[safeIndex] : null;

    useEffect(() => {
        setIsFlipped(false);
    }, [currentIndex]);

    useEffect(() => {
        localStorage.setItem('lingua_flashcard_direction', direction);
    }, [direction]);

    useEffect(() => {
        if (!currentWord) return;
        const isEnglishVisible = (direction === LanguageDirection.EN_TR && !isFlipped) ||
                                 (direction === LanguageDirection.TR_EN && isFlipped);
        if (isEnglishVisible) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(currentWord.english);
            u.lang = 'en-US';
            u.rate = 0.9;
            window.speechSynthesis.speak(u);
        }
    }, [currentIndex, isFlipped, direction, currentWord]);

    const triggerSuccessConfetti = () => {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
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
            
            localStorage.setItem(`lingua_flashcard_active_ids_${studyMode}_${selectedLevel}`, JSON.stringify(updatedActiveIds));
            setActiveIds(updatedActiveIds);
            onRemoveWord(currentWordId);

            const isLastCard = currentIndex >= currentSet.length - 1;

            const doAdvanceOrFinish = () => {
                if (updatedActiveIds.length === 0 || (isLastCard && currentIndex >= updatedActiveIds.length)) {
                    setIsFinished(true);
                    triggerSuccessConfetti();
                } else if (currentIndex >= updatedActiveIds.length) {
                    setCurrentIndex(Math.max(0, updatedActiveIds.length - 1));
                }
                // If currentIndex < updatedActiveIds.length, currentIndex stays the same,
                // which automatically displays the next card in the sequence!
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

    const handleNewSet = () => {
        const nextSetNum = currentSetNum < totalSets ? currentSetNum + 1 : 1;
        localStorage.removeItem(`lingua_flashcard_active_ids_${studyMode}_${selectedLevel}`);
        setActiveIds([]);
        setCurrentSetNum(nextSetNum);
        setIsFlipped(false);
        setIsFinished(false);
        onNextSet();
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
                    <p className="text-slate-500 font-bold mb-8">Bu gruptaki tüm kelimeleri inceledin.</p>

                    <div className="space-y-3 w-full">
                        <button
                            onClick={handleNewSet}
                            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black rounded-3xl font-black text-base hover:scale-105 transition-all shadow-xl shadow-yellow-500/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <BookOpen size={18} /> Yeni Set ile Devam Et
                        </button>

                        <button
                            onClick={onOpenModeSelection}
                            className="w-full py-4 bg-purple-600/10 text-purple-400 border border-purple-500/20 rounded-3xl font-black text-base hover:bg-purple-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <SlidersHorizontal size={18} /> Başka Moda Geç
                        </button>

                        {onGoToQuiz && (
                            <button
                                onClick={onGoToQuiz}
                                className="w-full py-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-3xl font-black text-base hover:bg-emerald-500 hover:text-black transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Puzzle size={18} /> Test Çöz
                            </button>
                        )}

                        <button
                            onClick={onExit}
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

    return (
        <div className="min-h-screen bg-black flex flex-col text-white font-['Plus_Jakarta_Sans']">
            {/* Top Header - Always visible */}
            <div className="w-full max-w-6xl mx-auto px-6 md:px-10 py-4 relative z-50">
                <div className="flex justify-between items-center w-full">
                    <button onClick={onExit} className="p-3 bg-zinc-900 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5 shadow-lg flex items-center gap-2">
                        <ArrowLeft size={20} />
                        <span className="hidden sm:inline text-xs font-bold">Ana Sayfa</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onOpenModeSelection}
                            className="bg-purple-600/20 border border-purple-500/30 px-4 py-2 rounded-full text-purple-300 font-black text-xs flex items-center gap-2 hover:bg-purple-600 hover:text-white transition-all"
                        >
                            <SlidersHorizontal size={14} /> Mod Seç
                        </button>
                        <button
                            onClick={() => setDirection(d => d === LanguageDirection.EN_TR ? LanguageDirection.TR_EN : LanguageDirection.EN_TR)}
                            className="bg-zinc-900 border border-white/10 px-4 py-2 rounded-full text-slate-400 font-black text-xs tracking-widest uppercase flex items-center gap-2 hover:text-white transition-all shadow-xl"
                        >
                            <Languages size={14} /> {direction === LanguageDirection.TR_EN ? 'TR → EN' : 'EN → TR'}
                        </button>
                    </div>

                    <button onClick={onExit} className="p-3 bg-zinc-900 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5 shadow-lg">
                        <Home size={20} />
                    </button>
                </div>

                {/* Level Tabs for Library Mode - Always visible */}
                {studyMode === 'LIBRARY' && (
                    <div className="flex justify-center items-center gap-2 mt-4 overflow-x-auto py-2">
                        {LEVELS.map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => onLevelChange(lvl)}
                                className={`px-4 py-1.5 rounded-full font-black text-xs transition-all border ${
                                    selectedLevel === lvl
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

            {/* If no currentWord (empty level state) */}
            {!currentWord ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center">
                    <div className="bg-zinc-900 border border-white/10 p-8 md:p-10 rounded-[40px] w-full shadow-2xl">
                        <BookOpen size={56} className="text-blue-500 mx-auto mb-4 animate-pulse" />
                        <h3 className="text-2xl font-black text-white mb-2">
                            {studyMode === 'LIBRARY' ? `${selectedLevel} Seviyesinde Kelime Bulunamadı` : 'Kelimeleriniz Bulunamadı'}
                        </h3>
                        <p className="text-slate-400 text-sm font-bold mb-8 leading-relaxed">
                            {studyMode === 'LIBRARY'
                                ? `${selectedLevel} seviyesindeki kelimeler yakında eklenecektir. Yukarıdaki sekmelerden A1 seviyesine geçebilir veya başka bir mod seçebilirsiniz.`
                                : 'Kelime listeniz henüz boş. AI ile yeni kelimeler ekleyebilir veya Kütüphane modundan çalışabilirsiniz.'}
                        </p>
                        
                        <div className="space-y-3 w-full">
                            {studyMode === 'LIBRARY' && selectedLevel !== 'A1' && (
                                <button
                                    onClick={() => onLevelChange('A1')}
                                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={18} /> A1 Seviyesine Geç
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
                    {/* Set Progress Bar */}
                    <div className="w-full max-w-sm mx-auto px-6 mb-2 mt-1">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                            <span>İlerleyen: {currentIndex + 1} / {currentSet.length}</span>
                            <span>SET {currentSetNum} / {totalSets}</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                            <div 
                                className="h-full bg-blue-500 transition-all duration-300 rounded-full shadow-[0_0_8px_#3b82f6]"
                                style={{ width: `${((currentIndex + 1) / (currentSet.length || 1)) * 100}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Main Flashcard */}
                    <div className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-sm mx-auto relative">
                        <div className="w-full aspect-[4/5.6] cursor-pointer perspective-1000 group" onClick={() => setIsFlipped(!isFlipped)}>
                            <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

                                {/* ÖN YÜZ */}
                                <div className={`absolute inset-0 backface-hidden rounded-[40px] flex flex-col items-center justify-between p-7 shadow-2xl ${isFrontTR ? 'bg-zinc-900 text-white border-2 border-zinc-800' : 'bg-yellow-400 text-black'}`}>
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
                                                className="mb-2 p-3 rounded-2xl bg-black/5 text-black/50 hover:bg-black/10 transition-all active:scale-90 hover:text-black"
                                            >
                                                <Volume2 size={26} />
                                            </button>
                                        )}
                                        <h2 className="text-3xl md:text-4xl font-black text-center mb-3 tracking-tight leading-tight">{isFrontTR ? currentWord.turkish : currentWord.english}</h2>

                                        {currentWord.category && (
                                            <span className={`text-[11px] font-bold px-3 py-1 rounded-full mb-3 flex items-center gap-1 opacity-80 ${isFrontTR ? 'bg-zinc-800 text-blue-300' : 'bg-black/10 text-black/80'}`}>
                                                <Tag size={10} /> {currentWord.category}
                                            </span>
                                        )}

                                        {(isFrontTR ? currentWord.turkish_sentence : currentWord.example_sentence) && (
                                            <p className="text-center text-xs font-bold italic px-3 leading-relaxed opacity-75">
                                                "{isFrontTR ? currentWord.turkish_sentence : currentWord.example_sentence}"
                                            </p>
                                        )}
                                    </div>

                                    <div className="w-full flex flex-col items-center gap-3">
                                        <span className={`text-[10px] font-black tracking-widest animate-blink ${isFrontTR ? 'text-blue-400' : 'text-black/50'}`}>
                                            ÇEVİRİ İÇİN TIKLA
                                        </span>

                                        <div className="flex items-center justify-center gap-2 w-full">
                                            <button
                                                onClick={(e) => handleSetProgressStatus(e, 'known')}
                                                className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 ${
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
                                <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-[40px] flex flex-col items-center justify-between p-7 shadow-2xl ${isFrontTR ? 'bg-yellow-400 text-black' : 'bg-zinc-900 text-white border-2 border-zinc-800'}`}>
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
                                                className="mb-2 p-3 rounded-2xl bg-black/5 text-black/50 hover:bg-black/10 transition-all active:scale-90 hover:text-black"
                                            >
                                                <Volume2 size={26} />
                                            </button>
                                        )}
                                        <h2 className="text-3xl md:text-4xl font-black text-center mb-3 tracking-tight leading-tight">{isFrontTR ? currentWord.english : currentWord.turkish}</h2>

                                        {currentWord.category && (
                                            <span className={`text-[11px] font-bold px-3 py-1 rounded-full mb-3 flex items-center gap-1 opacity-80 ${isFrontTR ? 'bg-black/10 text-black/80' : 'bg-zinc-800 text-blue-300'}`}>
                                                <Tag size={10} /> {currentWord.category}
                                            </span>
                                        )}

                                        {(isFrontTR ? currentWord.example_sentence : currentWord.turkish_sentence) && (
                                            <p className="text-center text-xs font-bold italic px-3 leading-relaxed opacity-75">
                                                "{isFrontTR ? currentWord.example_sentence : currentWord.turkish_sentence}"
                                            </p>
                                        )}
                                    </div>

                                    <div className="w-full flex flex-col items-center gap-3">
                                        <span className={`text-[10px] font-black tracking-widest animate-blink ${isFrontTR ? 'text-black/50' : 'text-blue-400'}`}>
                                            KELİMEYE DÖN
                                        </span>

                                        <div className="flex items-center justify-center gap-2 w-full">
                                            <button
                                                onClick={(e) => handleSetProgressStatus(e, 'known')}
                                                className={`px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 ${
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
                        <div className="mt-6 w-full flex justify-center items-center gap-4">
                            {currentIndex > 0 ? (
                                <>
                                    <button
                                        onClick={handlePrev}
                                        className="flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 text-slate-400 hover:text-white border border-white/5 transition-all active:scale-90 shadow-xl"
                                    >
                                        <ChevronLeft size={22} />
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="px-8 py-3.5 bg-white text-black rounded-2xl font-black text-sm hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-white/5 min-w-[140px]"
                                    >
                                        Sıradaki <ChevronRight size={18} />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    className="w-full max-w-[200px] py-3.5 bg-white text-black rounded-2xl font-black text-sm hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-white/5"
                                >
                                    Sıradaki <ChevronRight size={18} />
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
