import React, { useState, useEffect, useRef } from 'react';
import { LibrarySet, LanguageDirection } from '../types';
import { isMatch } from '../utils/stringUtils';
import { ArrowLeft, Home, Languages, CheckCircle2, Volume2, HelpCircle, Trophy, RefreshCw, BookOpen, Zap, Eye, XCircle } from 'lucide-react';
import { wordService } from '../services/supabaseClient';
import confetti from 'canvas-confetti';

interface LibraryPracticeScreenProps {
  set: LibrarySet;
  onExit: () => void;
  onGoHome: () => void;
  onGoToFlashcards?: () => void;
  onGoToQuiz?: () => void;
}

const LibraryPracticeScreen: React.FC<LibraryPracticeScreenProps> = ({ set, onExit, onGoHome, onGoToFlashcards, onGoToQuiz }) => {
  const [direction, setDirection] = useState<LanguageDirection>(LanguageDirection.TR_EN);
  
  const [completed, setCompleted] = useState<{ [key: string]: boolean }>({});
  const [inputs, setInputs] = useState<{ [key: string]: string }>({});
  const [wrongInputs, setWrongInputs] = useState<{ [key: string]: boolean }>({});
  
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [showOnlyWrong, setShowOnlyWrong] = useState(false);
  const [showFinishedModal, setShowFinishedModal] = useState(false);
  
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, sentenceId: string) => {
    if (e.key === 'Enter') {
      const input = inputs[sentenceId] || '';
      const sentence = set.sentences.find(s => s.id === sentenceId)!;
      const targetText = direction === LanguageDirection.TR_EN ? sentence.english : sentence.turkish;
      
      if (input.trim() === '') return;
      
      if (!isMatch(input, targetText)) {
        const newWrong = { ...wrongInputs, [sentenceId]: true };
        setWrongInputs(newWrong);
        localStorage.setItem(`library_wrong_${set.id}_${direction}`, JSON.stringify(newWrong));
      }
    }
  };

  const handleHelp = (sentenceId: string, targetText: string) => {
    const currentInput = inputs[sentenceId] || '';
    if (currentInput.length < targetText.length) {
      const nextInput = targetText.slice(0, currentInput.length + 1);
      checkAnswer(sentenceId, nextInput);
      inputRefs.current[sentenceId]?.focus();
    }
  };

  const handleReveal = (sentenceId: string, targetText: string) => {
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

  const handleDoubleClick = () => {
    const selection = window.getSelection();
    if (selection) {
      const text = selection.toString().trim();
      if (text.length > 1 && !text.includes(' ')) {
        setSelectedWord(text);
      }
    }
  };

  const confirmAddWord = async () => {
    if (!selectedWord) return;
    setIsAddingWord(true);
    try {
      await wordService.addWord({
        english: selectedWord,
        turkish: '',
        example_sentence: '',
        turkish_sentence: ''
      }, 'demo_user'); // Simplified for library practice
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
    localStorage.removeItem(`library_inputs_${set.id}_${direction}`);
    localStorage.removeItem(`library_wrong_${set.id}_${direction}`);
    localStorage.removeItem(`library_completed_${set.id}_${direction}`);
    setShowOnlyWrong(false);
    setShowFinishedModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetProgress = () => {
    if (window.confirm("Bu set için çalışmanı sıfırlamak istediğine emin misin?")) {
      handleRestart();
    }
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
                <p className="text-slate-400 font-medium text-lg mb-10 leading-relaxed">
                    <span className="text-purple-400 font-bold">{set.title}</span> kütüphane setindeki tüm cümleleri başarıyla çalıştın.
                </p>

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

      <div className="max-w-4xl mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-between mb-12">
          <button onClick={onExit} className="p-3 bg-zinc-900 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all">
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={() => setDirection(d => d === LanguageDirection.TR_EN ? LanguageDirection.EN_TR : LanguageDirection.TR_EN)}
              className="bg-blue-500/10 border border-blue-500/20 px-5 py-2.5 rounded-full text-blue-400 font-black text-[10px] tracking-widest uppercase flex items-center gap-2 hover:bg-blue-500/20 transition-all"
            >
              <Languages size={14} /> {direction.replace('_', ' → ')}
            </button>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {completedCount} / {set.sentences.length} TAMAMLANDI
            </span>
          </div>

          <button onClick={onGoHome} className="p-3 bg-zinc-900 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all">
            <Home size={20} />
          </button>
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black mb-2">{set.title}</h1>
          <p className="text-slate-500 font-bold text-sm">Cümleleri doğru şekilde çevirerek ilerle.</p>
        </div>

        <div className="space-y-6" onDoubleClick={handleDoubleClick}>
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
                  className={`p-8 rounded-[40px] border transition-all duration-300 ${
                    isDone ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' : 
                    isWrong ? 'bg-red-500/5 border-red-500/20 animate-shake' : 
                    'bg-zinc-900/50 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-[10px] font-black text-slate-600 tracking-tighter">#{idx + 1}</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => speak(promptText, direction === LanguageDirection.TR_EN ? 'tr-TR' : 'en-US')}
                        className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors"
                      >
                        <Volume2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleHelp(sentence.id, targetText)}
                        className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-blue-400 transition-colors"
                        disabled={isDone}
                      >
                        <HelpCircle size={16} />
                      </button>
                      <button 
                        onClick={() => handleReveal(sentence.id, targetText)}
                        className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-yellow-400 transition-colors"
                        disabled={isDone}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xl font-bold mb-6 text-slate-200">"{promptText}"</p>

                  <div className="relative">
                    <input
                      ref={el => inputRefs.current[sentence.id] = el}
                      type="text"
                      value={inputs[sentence.id] || ''}
                      onChange={(e) => checkAnswer(sentence.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, sentence.id)}
                      placeholder="Cümleyi buraya yaz..."
                      className={`w-full bg-black/40 border-2 rounded-2xl px-6 py-4 font-bold outline-none transition-all ${
                        isDone ? 'border-emerald-500/30 text-emerald-400' : 
                        isWrong ? 'border-red-500/30 text-white' : 
                        'border-white/10 focus:border-blue-500/50'
                      }`}
                      disabled={isDone}
                    />
                    {isDone && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />}
                    {isWrong && <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" size={20} />}
                  </div>
                </div>
              );
            })}
        </div>

        {set.sentences.length > 0 && (
          <div className="flex items-center justify-center gap-8 mt-12 mb-8">
            <button 
              onClick={handleResetProgress} 
              className="text-slate-500 hover:text-slate-300 font-bold transition-colors underline underline-offset-4"
            >
              Çalışmayı Sıfırla
            </button>
            <button 
              onClick={() => setShowOnlyWrong(!showOnlyWrong)} 
              className="text-blue-500/70 hover:text-blue-400 font-bold transition-colors underline underline-offset-4"
            >
              {showOnlyWrong ? "Tüm Cümleleri Göster" : "Sadece Hatalıları Göster"}
            </button>
          </div>
        )}
      </div>

      {selectedWord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-white mb-4">Listeye Ekle</h3>
            <p className="text-slate-300 font-medium mb-8">
              <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded">"{selectedWord}"</span> kelimesini ana çalışma listene eklemek istiyor musun?
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedWord(null)}
                className="flex-1 py-3.5 rounded-xl font-bold bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                disabled={isAddingWord}
              >
                Vazgeç
              </button>
              <button 
                onClick={confirmAddWord}
                className="flex-1 py-3.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={isAddingWord}
              >
                {isAddingWord ? 'Ekleniyor...' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryPracticeScreen;
