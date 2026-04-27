import React, { useState, useEffect, useRef } from 'react';
import { LibrarySet, LanguageDirection } from '../types';
import { isMatch } from '../utils/stringUtils';
import { ArrowLeft, Home, Languages, CheckCircle2, Volume2, Info, XCircle, Eye, HelpCircle, Trophy, RefreshCw, BookOpen, Zap } from 'lucide-react';
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
  
  // Track state using objects keyed by sentence.id
  const [completed, setCompleted] = useState<{ [key: string]: boolean }>({});
  const [inputs, setInputs] = useState<{ [key: string]: string }>({});
  const [wrongInputs, setWrongInputs] = useState<{ [key: string]: boolean }>({});
  
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [showOnlyWrong, setShowOnlyWrong] = useState(false);
  const [confirmRevealId, setConfirmRevealId] = useState<string | null>(null);
  const [showFinishedModal, setShowFinishedModal] = useState(false);
  
  // Create refs for each input to handle auto-focus and scroll
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    // Load progress and state from localStorage
    const savedCompletedStr = localStorage.getItem(`library_completed_${set.id}_${direction}`);
    const savedInputsStr = localStorage.getItem(`library_inputs_${set.id}_${direction}`);
    const savedWrongStr = localStorage.getItem(`library_wrong_${set.id}_${direction}`);
    
    let initialCompleted: { [key: string]: boolean } = {};
    
    // Migration from old completedCount (number) to new object format
    const oldSavedProgress = localStorage.getItem(`library_progress_${set.id}_${direction}`);
    const hasInputs = savedInputsStr && savedInputsStr !== '{}';
    
    if (oldSavedProgress && !savedCompletedStr && hasInputs) {
      const count = parseInt(oldSavedProgress, 10);
      if (!isNaN(count)) {
        for (let i = 0; i < count; i++) {
          if (set.sentences[i]) initialCompleted[set.sentences[i].id] = true;
        }
      }
      setCompleted(initialCompleted);
    } else if (savedCompletedStr) {
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

    // Scroll to the first uncompleted input on load
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
      // Trigger confetti
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

    // clear wrong state when user types
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
      // Basic word validation: length > 1, no spaces
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
      });
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
    localStorage.removeItem(`library_progress_${set.id}_${direction}`);
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
  }in. Harika iş çıkardın!</p>
          </div>
        )}

        {/* Footer actions */}
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

      {/* Word Add Modal */}
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
