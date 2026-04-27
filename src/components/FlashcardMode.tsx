
import React, { useState, useEffect, useMemo } from 'react';
import { Word, LanguageDirection } from '../types';
import { ArrowLeft, Volume2, Languages, Trophy, ChevronLeft, ChevronRight, Check, BookOpen, Puzzle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

const FLASHCARD_SET_SIZE = 20;

interface FlashcardModeProps {
    words: Word[];
    onExit: () => void;
    onNextSet: () => void;
    onRemoveWord: (id: string) => void;
    onGoToQuiz?: () => void;
    onGoToSentences?: () => void;
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({ words, onExit, onNextSet, onRemoveWord, onGoToQuiz, onGoToSentences }) => {
    // Random 20 kart — her "Yeni Set" tıklamasında yeniden seçilir
    const [setKey, setSetKey] = useState(0);

    const randomSet = useMemo(() => {
        if (!words || words.length === 0) return [];
        const shuffled = [...words].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, FLASHCARD_SET_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setKey]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [direction, setDirection] = useState<LanguageDirection>(() => {
        const saved = localStorage.getItem('lingua_flashcard_direction');
        return (saved as LanguageDirection) || LanguageDirection.TR_EN;
    });

    const currentWord = randomSet.length > 0 ? randomSet[currentIndex] : null;

    useEffect(() => {
        setIsFlipped(false);
    }, [currentIndex]);

    useEffect(() => {
        localStorage.setItem('lingua_flashcard_direction', direction);
    }, [direction]);

    const triggerSuccessConfetti = () => {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const doNext = () => {
            if (currentIndex < randomSet.length - 1) {
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

    const handleArchive = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentWord) return;
        onRemoveWord(currentWord.id);
        handleNext();
    };

    const handleNewSet = () => {
        setSetKey(k => k + 1);
        setCurrentIndex(0);
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
                            className="w-full py-4 bg-white text-black rounded-3xl font-black text-base hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                        >
                            <BookOpen size={18} /> Yeni Set ile Devam Et
                        </button>

                        {onGoToQuiz && (
                            <button
                                onClick={onGoToQuiz}
                                className="w-full py-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-3xl font-black text-base hover:bg-emerald-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Puzzle size={18} /> Test Çöz Modülüne Geç
                            </button>
                        )}

                        {onGoToSentences && (
                            <button
                                onClick={onGoToSentences}
                                className="w-full py-4 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-3xl font-black text-base hover:bg-purple-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Sparkles size={18} /> Cümle Pratiği Yap
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

    if (!currentWord) return null;

    const isFrontTR = direction === LanguageDirection.TR_EN;
    const frontWord = isFrontTR ? currentWord.turkish : currentWord.english;
    const backWord = isFrontTR ? currentWord.english : currentWord.turkish;
    const frontSentence = isFrontTR ? currentWord.turkish_sentence : currentWord.example_sentence;
    const backSentence = isFrontTR ? currentWord.example_sentence : currentWord.turkish_sentence;

    return (
        <div className="min-h-screen bg-black flex flex-col text-white font-['Plus_Jakarta_Sans']">
            {/* Top Header */}
            <div className="flex justify-between items-center p-6 md:px-10 md:py-8 relative z-50">
                <button onClick={onExit} className="p-3 bg-zinc-900 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5 shadow-lg"><ArrowLeft size={20} /></button>
                <div className="flex flex-col items-center">
                    <button
                        onClick={() => setDirection(d => d === LanguageDirection.EN_TR ? LanguageDirection.TR_EN : LanguageDirection.EN_TR)}
                        className="bg-zinc-900 border border-white/10 px-5 py-2 rounded-full text-slate-400 font-black text-[10px] tracking-widest uppercase flex items-center gap-3 hover:text-white transition-all mb-2 shadow-xl"
                    >
                        <Languages size={14} /> {direction === LanguageDirection.TR_EN ? 'TR → EN' : 'EN → TR'}
                    </button>
                    <div className="bg-zinc-900/50 px-3 py-1 rounded-full font-black text-[10px] text-slate-600 uppercase tracking-widest border border-white/5">{currentIndex + 1} / {randomSet.length}</div>
                </div>
                <div className="w-12"></div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-sm mx-auto relative">
                <div className="w-full aspect-[4/5.8] cursor-pointer perspective-1000 group" onClick={() => setIsFlipped(!isFlipped)}>
                    <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

                        {/* ÖN YÜZ */}
                        <div className={`absolute inset-0 backface-hidden rounded-[40px] flex flex-col items-center justify-center p-8 shadow-2xl ${isFrontTR ? 'bg-zinc-950 text-white border-2 border-zinc-800' : 'bg-yellow-400 text-black'}`}>
                            <div className={`absolute top-8 left-10 opacity-20 font-black uppercase tracking-[0.3em] text-[10px] ${isFrontTR ? 'text-white' : 'text-black'}`}>{isFrontTR ? 'TURKISH' : 'ENGLISH'}</div>

                            {!isFrontTR && (
                                <button
                                    onClick={(e) => speak(e, frontWord, 'en-US')}
                                    className="mb-2 p-3 rounded-2xl bg-black/5 text-black/40 hover:bg-black/10 transition-all active:scale-90 hover:text-black"
                                >
                                    <Volume2 size={28} />
                                </button>
                            )}
                            <h2 className="text-3xl md:text-4xl font-black text-center mb-6 tracking-tighter leading-tight">{frontWord}</h2>

                            {frontSentence && (
                                <p className={`text-center text-xs md:text-sm font-bold italic px-4 leading-relaxed opacity-60 mb-6`}>
                                    "{frontSentence}"
                                </p>
                            )}

                            <div className="flex flex-col items-center mt-4">
                                <span className={`text-xs font-black tracking-widest animate-blink ${isFrontTR ? 'text-blue-400' : 'text-black/40'}`}>ÇEVİRİ İÇİN TIKLA!!!</span>
                            </div>

                            <button
                                onClick={handleArchive}
                                className={`absolute bottom-12 px-5 py-2.5 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${isFrontTR ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white shadow-lg' : 'bg-black/10 text-black/50 border border-black/10 hover:bg-black hover:text-white shadow-sm'}`}
                            >
                                <Check size={12} strokeWidth={3} /> Öğrendim
                            </button>
                            <p className={`absolute bottom-5 text-[10px] font-bold opacity-40 px-12 text-center leading-tight ${isFrontTR ? 'text-white' : 'text-black'}`}>
                                Kelimeyi arşive taşır.
                            </p>
                        </div>

                        {/* ARKA YÜZ */}
                        <div className={`absolute inset-0 backface-hidden rotate-y-180 rounded-[40px] flex flex-col items-center justify-center p-8 shadow-2xl ${isFrontTR ? 'bg-yellow-400 text-black' : 'bg-zinc-950 text-white border-2 border-zinc-800'}`}>
                            <div className={`absolute top-8 left-10 opacity-20 font-black uppercase tracking-[0.3em] text-[10px] ${isFrontTR ? 'text-black' : 'text-white'}`}>{isFrontTR ? 'ENGLISH' : 'TURKISH'}</div>

                            {isFrontTR && (
                                <button
                                    onClick={(e) => speak(e, backWord, 'en-US')}
                                    className="mb-2 p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-all active:scale-90"
                                >
                                    <Volume2 size={28} />
                                </button>
                            )}
                            <h2 className="text-3xl md:text-4xl font-black text-center mb-6 tracking-tighter leading-tight">{backWord}</h2>

                            {backSentence && (
                                <p className={`text-center text-xs md:text-sm font-bold italic px-4 leading-relaxed opacity-60 mb-6`}>
                                    "{backSentence}"
                                </p>
                            )}

                            <div className="flex flex-col items-center mt-4">
                                <span className={`text-xs font-black tracking-widest animate-blink ${isFrontTR ? 'text-black/40' : 'text-blue-400'}`}>KELİMEYE DÖN!!!</span>
                            </div>

                            <button
                                onClick={handleArchive}
                                className={`absolute bottom-12 px-5 py-2.5 rounded-full font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${isFrontTR ? 'bg-black/10 text-black/50 border border-black/10 hover:bg-black hover:text-white shadow-sm' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white shadow-lg'}`}
                            >
                                <Check size={12} strokeWidth={3} /> Öğrendim
                            </button>
                            <p className={`absolute bottom-5 text-[10px] font-bold opacity-40 px-12 text-center leading-tight ${isFrontTR ? 'text-black' : 'text-white'}`}>
                                Kelimeyi arşive taşır.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation Controls */}
                <div className="mt-10 w-full flex justify-center items-center gap-4">
                    {currentIndex > 0 ? (
                        <>
                            <button
                                onClick={handlePrev}
                                className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 text-slate-400 hover:text-white border border-white/5 transition-all active:scale-90 shadow-xl"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={handleNext}
                                className="px-8 py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-white/5 min-w-[140px]"
                            >
                                Sıradaki <ChevronRight size={20} />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="w-full max-w-[200px] py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-blue-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-white/5"
                        >
                            Sıradaki <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FlashcardMode;
