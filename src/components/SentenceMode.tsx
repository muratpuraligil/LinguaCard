
import React, { useState, useEffect } from 'react';
import { Word, LanguageDirection } from '../types';
import { isMatch } from '../utils/stringUtils';
import { Check, X, RefreshCw, Type, Languages, ArrowLeft, Volume2, Sparkles, ChevronLeft, ChevronRight, Trophy, BookOpen, Zap } from 'lucide-react';

interface SentenceModeProps {
    words: Word[];
    onExit: () => void;
    onGoToFlashcards?: () => void;
    onGoToQuiz?: () => void;
    onRestartSentences?: () => void;
}

const SentenceMode: React.FC<SentenceModeProps> = ({ words, onExit, onGoToFlashcards, onGoToQuiz, onRestartSentences }) => {
    const [finished, setFinished] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(() => {
        const saved = localStorage.getItem('lingua_sentence_index');
        return saved ? Math.min(parseInt(saved), words.length - 1) : 0;
    });

    // Kullanıcının en uzak ulaştığı (doğruladığı) index'i takip et
    const [maxReachedIndex, setMaxReachedIndex] = useState(() => {
        const saved = localStorage.getItem('lingua_sentence_max_reached');
        return saved ? parseInt(saved) : 0;
    });

    const [userInput, setUserInput] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
    const [direction, setDirection] = useState<LanguageDirection>(() => {
        const saved = localStorage.getItem('lingua_sentence_direction');
        return (saved as LanguageDirection) || LanguageDirection.TR_EN;
    });

    useEffect(() => {
        localStorage.setItem('lingua_sentence_direction', direction);
        setUserInput('');
        setStatus('IDLE');
    }, [direction]);

    const validWords = words.filter(w => w.example_sentence && w.example_sentence.length > 3);
    const currentWord = validWords[currentIndex];

    useEffect(() => {
        localStorage.setItem('lingua_sentence_index', currentIndex.toString());
    }, [currentIndex]);

    useEffect(() => {
        localStorage.setItem('lingua_sentence_max_reached', maxReachedIndex.toString());
    }, [maxReachedIndex]);

    const checkAnswer = () => {
        if (!currentWord) return;

        const targetText = direction === LanguageDirection.TR_EN ? currentWord.example_sentence : currentWord.turkish_sentence;

        if (isMatch(userInput, targetText)) {
            setStatus('CORRECT');
            // Eğer en ileri noktadaysak, sınırı genişlet
            if (currentIndex === maxReachedIndex) {
                setMaxReachedIndex(currentIndex + 1);
            }
        }
        else setStatus('WRONG');
    };

    const handleNext = () => {
        if (currentIndex < validWords.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserInput('');
            setStatus('IDLE');
        } else {
            localStorage.removeItem('lingua_sentence_index');
            localStorage.removeItem('lingua_sentence_max_reached');
            localStorage.removeItem('lingua_active_sentence_set');
            setFinished(true);
        }
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setUserInput('');
            setStatus('IDLE');
        }
    };

    const handleForward = () => {
        // Sadece doğrulanmış (maxReachedIndex uyarınca) sınıra kadar git
        if (currentIndex < validWords.length - 1 && currentIndex < maxReachedIndex) {
            setCurrentIndex(prev => prev + 1);
            setUserInput('');
            setStatus('IDLE');
        }
    };

    const speak = () => {
        window.speechSynthesis.cancel();
        // Always speak English sentence as requested
        const textToSpeak = currentWord.example_sentence;
        const lang = 'en-US';

        const u = new SpeechSynthesisUtterance(textToSpeak);
        u.lang = lang;
        window.speechSynthesis.speak(u);
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setMaxReachedIndex(0);
        setFinished(false);
        setUserInput('');
        setStatus('IDLE');
        if (onRestartSentences) onRestartSentences();
    };

    const confirmReset = () => {
        handleRestart();
        setShowResetConfirm(false);
    };

    if (finished) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center font-['Plus_Jakarta_Sans']">
                <div className="bg-zinc-900 border border-purple-500/20 p-10 rounded-[56px] shadow-2xl w-full max-w-sm relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
                    <Trophy className="text-purple-500 w-20 h-20 mx-auto mb-6 animate-bounce" />
                    <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Harika Bir Set!</h2>
                    <p className="text-slate-500 font-bold mb-8">Bu gruptaki tüm cümleleri tamamladın.</p>

                    <div className="space-y-3">
                        <button
                            onClick={handleRestart}
                            className="w-full bg-white text-black py-4 rounded-3xl font-black text-base hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} /> Cümleler ile Tekrar Çalış
                        </button>

                        {onGoToFlashcards && (
                            <button
                                onClick={onGoToFlashcards}
                                className="w-full py-4 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-3xl font-black text-base hover:bg-yellow-500 hover:text-black transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <BookOpen size={18} /> Kartlar ile Çalış
                            </button>
                        )}

                        {onGoToQuiz && (
                            <button
                                onClick={onGoToQuiz}
                                className="w-full py-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-3xl font-black text-base hover:bg-emerald-500 hover:text-black transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Zap size={18} /> Test Çöz Modülüne Geç
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

    if (!currentWord) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 font-['Plus_Jakarta_Sans']">
            <p className="text-slate-500 font-black mb-8">Cümle içeren kelime bulunamadı.</p>
            <button onClick={onExit} className="bg-white text-black px-8 py-4 rounded-2xl font-black">Geri Dön</button>
        </div>
    );

    const promptText = direction === LanguageDirection.TR_EN ? currentWord.turkish_sentence : currentWord.example_sentence;
    const targetText = direction === LanguageDirection.TR_EN ? currentWord.example_sentence : currentWord.turkish_sentence;

    const progressPercent = ((currentIndex + 1) / validWords.length) * 100;

    // İleri butonunun aktiflik durumu
    const canGoForward = currentIndex < maxReachedIndex && currentIndex < validWords.length - 1;

    return (
        <div className="min-h-screen bg-black flex flex-col font-['Plus_Jakarta_Sans'] relative overflow-hidden text-white">
            {/* İlerleme Çubuğu */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-900 z-50">
                <div
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(147,51,234,0.5)]"
                    style={{ width: `${progressPercent}%` }}
                ></div>
            </div>

            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full"></div>

            {/* Header */}
            <div className="p-8 pt-10 flex justify-between items-center relative z-10">
                <button onClick={onExit} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all">
                    <ArrowLeft size={24} />
                </button>

                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={() => setDirection(d => d === LanguageDirection.TR_EN ? LanguageDirection.EN_TR : LanguageDirection.TR_EN)}
                        className="bg-purple-500/10 border border-purple-500/20 px-6 py-3 rounded-full text-purple-400 font-black text-[10px] tracking-widest uppercase flex items-center gap-3 hover:bg-purple-500/20 transition-all mb-2"
                    >
                        <Languages size={16} /> {direction.replace('_', ' → ')}
                    </button>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        {currentIndex + 1} / {validWords.length}
                    </span>
                </div>

                <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                    title="İlerlemeyi Sıfırla"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="flex-1 px-8 flex flex-col justify-center max-w-2xl mx-auto w-full relative z-10">
                <div className="bg-[#0a0a0a] rounded-[56px] p-10 border border-white/5 shadow-2xl mb-8 relative group">
                    <div className="absolute top-0 right-0 p-10 opacity-5">
                        <Sparkles size={120} className="text-purple-500" />
                    </div>



                    <p className="text-3xl font-black text-white mb-10 leading-snug tracking-tight">"{promptText}"</p>

                    <button onClick={speak} className="flex items-center gap-3 text-white/40 font-black text-[10px] uppercase tracking-widest hover:text-purple-400 transition-all mb-8">
                        <Volume2 size={20} /> Telaffuzu Dinle
                    </button>

                    <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Çevirini buraya yaz..."
                        className="w-full p-8 rounded-[40px] bg-zinc-800 border-2 border-white/20 focus:border-purple-500/50 focus:bg-zinc-700/50 outline-none h-44 resize-none text-xl font-bold transition-all text-white placeholder:text-zinc-500 shadow-inner"
                        disabled={status === 'CORRECT'}
                    />

                    {status === 'WRONG' && (
                        <div className="mt-6 p-6 bg-red-500/10 text-red-400 rounded-[32px] border border-red-500/20 animate-shake">
                            <p className="font-black flex items-center gap-3 mb-2 uppercase text-[10px] tracking-widest"><X size={20} /> Hatalı Deneme</p>
                            <p className="text-lg font-bold leading-relaxed">Doğrusu: <span className="text-white">"{targetText}"</span></p>
                        </div>
                    )}
                    {status === 'CORRECT' && (
                        <div className="mt-6 p-6 bg-emerald-500/10 text-emerald-400 rounded-[32px] border border-emerald-500/20 animate-bounce">
                            <p className="font-black flex items-center gap-3 uppercase text-[10px] tracking-widest"><Check size={20} /> Mükemmel!</p>
                            <p className="text-lg font-bold">Harika bir çeviri yaptın.</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Geri Butonu */}
                    <button
                        onClick={handleBack}
                        disabled={currentIndex === 0}
                        className={`p-6 rounded-[40px] border border-white/5 transition-all active:scale-95 flex items-center justify-center
                    ${currentIndex === 0 ? 'bg-zinc-900/50 text-slate-700 cursor-not-allowed' : 'bg-zinc-900 text-slate-400 hover:bg-zinc-800 hover:text-white'}
                `}
                    >
                        <ChevronLeft size={32} />
                    </button>

                    {/* Kontrol Et / Devam Et Butonu */}
                    <button
                        onClick={status === 'IDLE' ? checkAnswer : handleNext}
                        className={`flex-1 py-8 rounded-[40px] font-black text-2xl shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-4 ${status === 'IDLE' ? 'bg-purple-600 text-white shadow-purple-600/20' : 'bg-white text-black'}`}
                    >
                        {status === 'IDLE' ? 'Kontrol Et' : 'Devam Et'}
                    </button>

                    {/* İleri Butonu (Sadece maxReachedIndex'e kadar) */}
                    <button
                        onClick={handleForward}
                        disabled={!canGoForward}
                        className={`p-6 rounded-[40px] border border-white/5 transition-all active:scale-95 flex items-center justify-center
                    ${!canGoForward ? 'bg-zinc-900/50 text-slate-700 cursor-not-allowed' : 'bg-zinc-900 text-slate-400 hover:bg-zinc-800 hover:text-white'}
                `}
                        title={!canGoForward ? "Henüz burayı çözmediniz" : "Sonraki çözülmüş cümle"}
                    >
                        <ChevronRight size={32} />
                    </button>
                </div>
            </div>

            <div className="pb-10"></div>

            {/* Reset Confirmation Modal */}
            {showResetConfirm && (
                <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn font-['Plus_Jakarta_Sans']">
                    <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden animate-scaleIn">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 text-red-500">
                            <RefreshCw size={32} />
                        </div>

                        <h3 className="text-xl font-black text-white mb-2">Sıfırla?</h3>
                        <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                            Bu set için tüm ilerlemen silinecek. Baştan başlamak istediğine emin misin?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowResetConfirm(false)}
                                className="flex-1 py-4 rounded-xl bg-zinc-900 text-slate-400 font-bold hover:bg-zinc-800 hover:text-white transition-all"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={confirmReset}
                                className="flex-1 py-4 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
                            >
                                Evet, Sıfırla
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SentenceMode;
