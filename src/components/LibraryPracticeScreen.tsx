import React, { useState, useEffect, useRef } from 'react';
import { LibrarySet, LanguageDirection } from '../types';
import { isMatch } from '../utils/stringUtils';
import { ArrowLeft, ArrowUp, Home, Languages, CheckCircle2, Volume2, HelpCircle, Trophy, RefreshCw, BookOpen, Zap, Eye, XCircle, Info, Plus } from 'lucide-react';
import { wordService, supabase } from '../services/supabaseClient';
import confetti from 'canvas-confetti';

interface LibraryPracticeScreenProps {
  set: LibrarySet;
  onExit: () => void;
  onGoHome: () => void;
  onGoToFlashcards?: () => void;
  onGoToQuiz?: () => void;
  onRegenerate?: () => void;
}

const LibraryPracticeScreen: React.FC<LibraryPracticeScreenProps> = ({ set, onExit, onGoHome, onGoToFlashcards, onGoToQuiz, onRegenerate }) => {
  const [direction, setDirection] = useState<LanguageDirection>(LanguageDirection.TR_EN);
  
  const [completed, setCompleted] = useState<{ [key: string]: boolean }>({});
  const [inputs, setInputs] = useState<{ [key: string]: string }>({});
  const [wrongInputs, setWrongInputs] = useState<{ [key: string]: boolean }>({});
  
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [showOnlyWrong, setShowOnlyWrong] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showFinishedModal, setShowFinishedModal] = useState(false);
  const [confirmRevealId, setConfirmRevealId] = useState<string | null>(null);
  const [everWrongIds, setEverWrongIds] = useState<Set<string>>(new Set());
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  
  const inputRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  useEffect(() => {
    const savedCompletedStr = localStorage.getItem(`library_completed_${set.id}_${direction}`);
    const savedInputsStr = localStorage.getItem(`library_inputs_${set.id}_${direction}`);
    const savedWrongStr = localStorage.getItem(`library_wrong_${set.id}_${direction}`);
    
    let initialCompleted: { [key: string]: boolean } = {};
    
    if (savedCompletedStr) {
      try { initialCompleted = JSON.parse(savedCompletedStr); } catch {}
      setCompleted(initialCompleted);
    } else {
      setCompleted({});
    }

    if (savedInputsStr) {
      try { setInputs(JSON.parse(savedInputsStr)); } catch {}
    } else {
      setInputs({});
    }

    if (savedWrongStr) {
      try { setWrongInputs(JSON.parse(savedWrongStr)); } catch {}
    } else {
      setWrongInputs({});
    }

    setTimeout(() => {
      // Resize all textareas on mount/direction change
      Object.values(inputRefs.current).forEach(el => {
        if (el) {
          el.style.height = 'auto';
          el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
        }
      });

      const firstUncompleted = set.sentences.find(s => !initialCompleted[s.id]);
      if (firstUncompleted) {
        const el = inputRefs.current[firstUncompleted.id];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }
    }, 300);
  }, [set, direction]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const completedCount = Object.keys(completed).length;
  const isAllCompleted = set.sentences.length > 0 && completedCount === set.sentences.length;

  useEffect(() => {
    if (isAllCompleted && !showFinishedModal) {
      setShowFinishedModal(true);
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
          confetti({
              particleCount: 2,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors: ['#3b82f6', '#eab308', '#ffffff']
          });
          confetti({
              particleCount: 2,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors: ['#3b82f6', '#eab308', '#ffffff']
          });

          if (Date.now() < end) {
              requestAnimationFrame(frame);
          }
      };
      frame();
    }
  }, [isAllCompleted, showFinishedModal]);

  const checkAnswer = (sentenceId: string, input: string) => {
    const newInputs = { ...inputs, [sentenceId]: input };
    setInputs(newInputs);
    localStorage.setItem(`library_inputs_${set.id}_${direction}`, JSON.stringify(newInputs));

    if (wrongInputs[sentenceId]) {
      const newWrong = { ...wrongInputs };
      delete newWrong[sentenceId];
      setWrongInputs(newWrong);
      localStorage.setItem(`library_wrong_${set.id}_${direction}`, JSON.stringify(newWrong));
    }

    const sentence = set.sentences.find(s => s.id === sentenceId)!;
    const targetText = direction === LanguageDirection.TR_EN ? sentence.english : sentence.turkish;
    
    if (isMatch(input, targetText)) {
      if (!completed[sentenceId]) {
        const newCompleted = { ...completed, [sentenceId]: true };
        setCompleted(newCompleted);
        localStorage.setItem(`library_completed_${set.id}_${direction}`, JSON.stringify(newCompleted));
        
        // Speak the correct answer
        speak(targetText, direction === LanguageDirection.TR_EN ? 'en-US' : 'tr-TR');

        // Auto-focus the next uncompleted input sequentially
        const currentIndex = set.sentences.findIndex(s => s.id === sentenceId);
        for (let i = currentIndex + 1; i < set.sentences.length; i++) {
          const nextId = set.sentences[i].id;
          if (!newCompleted[nextId]) {
            setTimeout(() => {
              inputRefs.current[nextId]?.focus();
            }, 100);
            break;
          }
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, sentenceId: string) => {
    if (e.key === 'Enter') {
      const input = inputs[sentenceId] || '';
      const sentence = set.sentences.find(s => s.id === sentenceId)!;
      const targetText = direction === LanguageDirection.TR_EN ? sentence.english : sentence.turkish;
      
      if (input.trim() === '') return;
      
      if (!isMatch(input, targetText)) {
        const newWrong = { ...wrongInputs, [sentenceId]: true };
        setWrongInputs(newWrong);
        setEverWrongIds(prev => new Set(prev).add(sentenceId));
        localStorage.setItem(`library_wrong_${set.id}_${direction}`, JSON.stringify(newWrong));
      }
    }
  };

  const handleHelp = (sentenceId: string, targetText: string) => {
    const currentInput = inputs[sentenceId] || '';
    if (currentInput.length < targetText.length) {
      const nextInput = targetText.slice(0, currentInput.length + 1);
      setEverWrongIds(prev => new Set(prev).add(sentenceId));
      checkAnswer(sentenceId, nextInput);
      inputRefs.current[sentenceId]?.focus();
    }
  };

  const handleReveal = (sentenceId: string, targetText: string) => {
    setEverWrongIds(prev => new Set(prev).add(sentenceId));
    checkAnswer(sentenceId, targetText);
  };

  const handleClear = (sentenceId: string) => {
    const newInputs = { ...inputs, [sentenceId]: '' };
    setInputs(newInputs);
    localStorage.setItem(`library_inputs_${set.id}_${direction}`, JSON.stringify(newInputs));

    const newWrong = { ...wrongInputs };
    delete newWrong[sentenceId];
    setWrongInputs(newWrong);
    localStorage.setItem(`library_wrong_${set.id}_${direction}`, JSON.stringify(newWrong));

    inputRefs.current[sentenceId]?.focus();
  };

  const handleDoubleClick = (text: string) => {
    if (!text) return;
    // Punctuation characters to strip
    const cleanText = text.replace(/[.,!?;:()"]/g, "").trim();
    if (cleanText && cleanText.length >= 1 && !cleanText.includes(' ')) {
      setSelectedWord(cleanText);
    }
  };

  const confirmAddWord = async () => {
    if (!selectedWord) return;
    setIsAddingWord(true);
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      await wordService.addWord({
        english: selectedWord,
        turkish: '',
        example_sentence: '',
        turkish_sentence: ''
      }, session?.user?.id);
      setSelectedWord(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAddingWord(false);
    }
  };

  const speak = (text: string, lang: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  };

  const handleRestart = () => {
    setInputs({});
    setWrongInputs({});
    setCompleted({});
    
    // Temizlik: Her iki yön için de yeni ve eski anahtarları temizle
    ['TR_EN', 'EN_TR'].forEach(dir => {
        localStorage.removeItem(`library_inputs_${set.id}_${dir}`);
        localStorage.removeItem(`library_wrong_${set.id}_${dir}`);
        localStorage.removeItem(`library_completed_${set.id}_${dir}`);
        localStorage.removeItem(`library_progress_${set.id}_${dir}`); // Eski format
    });
    
    setShowOnlyWrong(false);
    setShowFinishedModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleResetProgress = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    handleRestart();
    setShowResetConfirm(false);
  };

  if (showFinishedModal) {
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-8 font-['Plus_Jakarta_Sans']">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-black to-black"></div>

            <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-purple-500/20 p-10 rounded-[56px] text-center shadow-2xl animate-float">
                <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                    <Trophy size={48} className="text-purple-500" strokeWidth={2} />
                </div>

                <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Harika Bir Set!</h2>
                <p className="text-slate-400 font-medium text-lg mb-8 leading-relaxed">
                    <span className="text-purple-400 font-bold">{set.title}</span> kütüphane setindeki tüm cümleleri başarıyla çalıştın.
                </p>

                {set.id === 'random-mix' && (
                    <div className="mb-10 text-left bg-black/40 border border-white/5 rounded-3xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Info size={16} className="text-blue-400" />
                            <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">Hata Yapılan Gruplar</h3>
                        </div>
                        {everWrongIds.size > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(
                                    set.sentences
                                        .filter(s => everWrongIds.has(s.id))
                                        .map(s => s.sourceSetTitle)
                                        .filter(Boolean)
                                )).map((title, i) => (
                                    <span key={i} className="text-[10px] font-bold px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">
                                        {title}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-emerald-400 text-xs font-bold">Tebrikler! Hiç hata yapmadan tamamladın. 🔥</p>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handleRestart}
                        className="w-full bg-white text-black py-4 rounded-3xl font-black text-base hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={18} /> Cümleler ile Tekrar Çalış
                    </button>

                    {onRegenerate && (
                        <button
                            onClick={() => {
                                onRegenerate();
                                setShowFinishedModal(false);
                            }}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-3xl font-black text-base hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 border border-white/10"
                        >
                            <RefreshCw size={18} /> Yeni Set Üret
                        </button>
                    )}

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
                        onClick={onGoHome}
                        className="w-full py-4 bg-zinc-900 text-slate-400 rounded-3xl font-black text-base border border-white/5 active:scale-95 transition-all hover:text-white"
                    >
                        Dashboard'a Dön
                    </button>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col font-['Plus_Jakarta_Sans'] relative text-white">
      <div className="sticky top-0 left-0 w-full h-1.5 bg-zinc-900 z-50">
        <div 
          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${(completedCount / set.sentences.length) * 100}%` }}
        ></div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-6 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onExit} className="p-3 bg-zinc-900 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all shrink-0">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">{set.title}</h1>
              <p className="text-slate-500 font-bold text-xs md:text-sm">Cümleleri doğru şekilde çevirerek ilerle.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-end md:self-auto w-full md:w-auto justify-end">
            <div className="flex flex-col items-end mr-2">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  İLERLEME
                </span>
                <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">
                  {completedCount} / {set.sentences.length}
                </span>
            </div>
            
            <button 
              onClick={() => setDirection(d => d === LanguageDirection.TR_EN ? LanguageDirection.EN_TR : LanguageDirection.TR_EN)}
              className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 md:px-4 md:py-2.5 rounded-2xl text-blue-400 font-black text-[10px] tracking-widest uppercase flex items-center gap-2 hover:bg-blue-500/20 transition-all shrink-0"
            >
              <Languages size={14} /> <span className="hidden sm:inline">{direction.replace('_', ' → ')}</span>
            </button>

            <button onClick={onGoHome} className="p-3 bg-zinc-900 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all shrink-0">
              <Home size={20} />
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="w-full bg-blue-900/10 border border-blue-500/20 p-4 rounded-2xl mb-8 flex flex-col gap-3">
            <div className="flex items-start gap-3">
                <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Info size={16} />
                </div>
                <p className="text-xs md:text-sm font-semibold text-blue-200/80 leading-relaxed pt-0.5">
                    Çeviri girişi doğru sağlandığı anda bir sonraki cümleye geçiş otomatik gerçekleşir.
                </p>
            </div>
            <div className="flex items-start gap-3 border-t border-blue-500/10 pt-3">
                <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Plus size={16} />
                </div>
                <p className="text-xs md:text-sm font-semibold text-blue-200/80 leading-relaxed pt-0.5">
                    Öğrenmek istediğiniz kelimelere çift tıklayarak çalışma listenize ekleyebilirsiniz.
                </p>
            </div>
        </div>


        <div className="space-y-3">
          {set.sentences
            .filter(s => !showOnlyWrong || wrongInputs[s.id])
            .map((sentence, idx) => {
              const isDone = completed[sentence.id];
              const isWrong = wrongInputs[sentence.id];
              const promptText = direction === LanguageDirection.TR_EN ? sentence.turkish : sentence.english;
              const targetText = direction === LanguageDirection.TR_EN ? sentence.english : sentence.turkish;

              return (
                <div 
                  key={sentence.id} 
                  className={`group relative flex flex-col md:flex-row items-stretch bg-zinc-900 rounded-[20px] border-2 transition-all w-full
                    ${isDone ? 'border-emerald-500/30 bg-emerald-900/10 opacity-70' : 
                      isWrong ? 'border-red-500/30 animate-shake' : 
                      'border-zinc-800 focus-within:border-blue-500/50 hover:border-zinc-700'}
                  `}
                >

                  {/* Left: Prompt */}
                  <div 
                    className="flex-1 p-3 md:p-4 border-b md:border-b-0 md:border-r border-white/5 bg-white/5 md:bg-transparent cursor-pointer hover:bg-white/5 transition-colors flex items-center"
                    onDoubleClick={() => {
                        const selection = window.getSelection()?.toString().trim();
                        handleDoubleClick(selection || '');
                    }}
                  >
                    <p className="text-base md:text-lg font-bold text-slate-200 leading-snug break-words">
                      <span className="text-slate-500 mr-2 select-none">{idx + 1}.</span>
                      {promptText}
                    </p>
                  </div>

                  {/* Right: Input */}
                  <div className="flex-1 p-2 md:p-3 flex items-center justify-center bg-black/20">
                    <div className="w-full flex items-center gap-2">
                        <div className="relative flex-1 flex flex-col justify-center">
                            <textarea
                                ref={el => inputRefs.current[sentence.id] = el as any}
                                rows={1}
                                value={inputs[sentence.id] || ''}
                                onChange={(e) => {
                                    checkAnswer(sentence.id, e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleKeyDown(e as any, sentence.id);
                                    }
                                }}
                                onDoubleClick={(e) => {
                                    const input = e.currentTarget;
                                    const start = input.selectionStart || 0;
                                    const end = input.selectionEnd || 0;
                                    handleDoubleClick(input.value.substring(start, end).trim());
                                }}
                                placeholder={direction === LanguageDirection.TR_EN ? "İngilizce çevirisi..." : "Türkçe çevirisi..."}
                                className={`w-full bg-zinc-800/50 border border-white/10 rounded-xl pl-4 pr-32 py-3 text-base font-bold outline-none transition-all resize-none leading-relaxed placeholder:text-zinc-700
                                    ${isDone ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5 cursor-default' : 
                                      isWrong ? 'text-red-400 border-red-500/30' : 
                                      'text-white focus:border-blue-500/50 focus:bg-zinc-800'}
                                `}
                                style={{ minHeight: '52px' }}
                                readOnly={isDone}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                 {!isDone && (
                                     <>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); speak(promptText, direction === LanguageDirection.TR_EN ? 'tr-TR' : 'en-US'); }}
                                            className="p-1.5 text-slate-500 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                                            title="Telaffuzu Dinle"
                                        >
                                            <Volume2 size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleHelp(sentence.id, targetText); }}
                                            className="p-1.5 text-slate-500 hover:bg-white/10 hover:text-blue-400 rounded-lg transition-colors"
                                            title="İpucu Al"
                                        >
                                            <HelpCircle size={16} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if (confirmRevealId === sentence.id) {
                                                    handleReveal(sentence.id, targetText);
                                                    setConfirmRevealId(null);
                                                } else {
                                                    setConfirmRevealId(sentence.id);
                                                    setTimeout(() => setConfirmRevealId(null), 3000);
                                                }
                                            }}
                                            className={`p-1.5 rounded-lg transition-all ${confirmRevealId === sentence.id ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-slate-500 hover:bg-white/10 hover:text-yellow-500'}`}
                                            title={confirmRevealId === sentence.id ? "Onaylamak için tekrar tıkla" : "Cevabı Göster"}
                                        >
                                            {confirmRevealId === sentence.id ? <CheckCircle2 size={16} /> : <Eye size={16} />}
                                        </button>
                                     </>
                                 )}
                                 {isDone && (
                                     <button 
                                         onClick={(e) => { e.stopPropagation(); speak(targetText, direction === LanguageDirection.TR_EN ? 'en-US' : 'tr-TR'); }}
                                         className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors mr-1"
                                         title="Cevabı Dinle"
                                     >
                                         <Volume2 size={20} />
                                     </button>
                                 )}
                                 {isWrong && <XCircle className="text-red-500 animate-pulse pointer-events-none mr-2" size={20} />}
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {set.sentences.length > 0 && (
          <div className="flex items-center justify-center flex-wrap gap-x-8 gap-y-4 mt-16 mb-8">
            <button 
              onClick={handleResetProgress} 
              className="text-slate-500 hover:text-slate-300 font-black text-[10px] uppercase tracking-widest transition-colors underline underline-offset-8"
            >
              Çalışmayı Sıfırla
            </button>
            <button 
              onClick={() => setShowOnlyWrong(!showOnlyWrong)} 
              className="text-blue-500/70 hover:text-blue-400 font-black text-[10px] uppercase tracking-widest transition-colors underline underline-offset-8"
            >
              {showOnlyWrong ? "Tüm Cümleleri Göster" : "Sadece Hatalıları Göster"}
            </button>
            {onRegenerate && (
              <button 
                onClick={() => setShowRegenerateConfirm(true)} 
                className="text-purple-500/70 hover:text-purple-400 font-black text-[10px] uppercase tracking-widest transition-colors underline underline-offset-8"
              >
                Yeni Set Üret
              </button>
            )}
          </div>
        )}
      </div>

      {selectedWord && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <h3 className="text-xl font-black text-white mb-4">Listeye Ekle</h3>
            <p className="text-slate-300 font-medium mb-8 leading-relaxed">
              <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded-md mx-1">"{selectedWord}"</span> 
              kelimesini ana çalışma listene eklemek istiyor musun?
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedWord(null)}
                className="flex-1 py-4 rounded-2xl font-bold bg-zinc-800 text-slate-400 hover:bg-zinc-700 transition-colors"
                disabled={isAddingWord}
              >
                Vazgeç
              </button>
              <button 
                onClick={confirmAddWord}
                className="flex-1 py-4 rounded-2xl font-bold bg-blue-600 text-white hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                disabled={isAddingWord}
              >
                {isAddingWord ? 'Ekleniyor...' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
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

      {/* Regenerate Confirmation Modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden animate-scaleIn">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500"></div>
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 text-purple-500">
              <RefreshCw size={32} />
            </div>

            <h3 className="text-xl font-black text-white mb-2">Yeni Set Üret?</h3>
            <p className="text-slate-400 font-medium mb-8 leading-relaxed">
              Yeni bir set üretilecek, onaylıyor musunuz?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="flex-1 py-4 rounded-xl bg-zinc-900 text-slate-400 font-bold hover:bg-zinc-800 hover:text-white transition-all"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  onRegenerate?.();
                  setShowRegenerateConfirm(false);
                }}
                className="flex-1 py-4 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20"
              >
                Evet, Üret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scroll to Top Button - Moved back to fixed bottom-left as requested */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-10 left-6 md:left-[calc(50%-590px)] z-[1000] group flex flex-col items-center gap-2 p-3 bg-zinc-900/80 backdrop-blur-xl hover:bg-blue-600/10 border border-white/10 hover:border-blue-500/30 rounded-3xl transition-all duration-500 hover:scale-110 active:scale-95 shadow-2xl shadow-black/40"
          title="yukarıya dön"
        >
          <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center animate-bounce group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
            <ArrowUp size={20} />
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100 transition-opacity duration-300">yukarıya dön</span>
        </button>
      )}
    </div>
  );
};

export default LibraryPracticeScreen;
