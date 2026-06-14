import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Word, LanguageDirection } from '../types';
import { CheckCircle, ArrowLeft, Languages, Zap, BookOpen, Sparkles, RefreshCw, X, Volume2, VolumeX } from 'lucide-react';

const QUIZ_SET_SIZE = 20;

const LOCAL_STORAGE_KEYS = {
  DIRECTION: 'lingua_quiz_direction',
  TTS_ENABLED: 'lingua_quiz_tts_enabled',
};

interface QuizModeProps {
  words: Word[];
  allWords: Word[];
  onExit: () => void;
  onGoToFlashcards?: () => void;
  onGoToSentences?: () => void;
}

const QuizMode: React.FC<QuizModeProps> = ({ words, allWords, onExit, onGoToFlashcards, onGoToSentences }) => {
  // Random set key — her yeni set başlatıldığında değişir
  const [setKey, setSetKey] = useState(0);

  // Tüm kelimelerden random 20 seç
  const randomSet = useMemo(() => {
    if (!words || words.length === 0) return [];
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, QUIZ_SET_SIZE);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setKey]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);

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

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.DIRECTION, direction);
  }, [direction]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.TTS_ENABLED, isTtsEnabled.toString());
  }, [isTtsEnabled]);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }, []);

  const currentWord = randomSet[currentIndex];

  const options = useMemo(() => {
    if (!currentWord) return [];

    const correct = direction === LanguageDirection.EN_TR ? currentWord.turkish : currentWord.english;
    const key = direction === LanguageDirection.EN_TR ? 'turkish' : 'english';

    const otherWords = allWords.filter(w => w.id !== currentWord.id);
    const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random());
    const wrongAnswers = shuffledOthers.slice(0, 3).map(w => (w as any)[key]);

    while (wrongAnswers.length < 3) {
      wrongAnswers.push("Kelime " + Math.floor(Math.random() * 100));
    }

    return [correct, ...wrongAnswers].sort(() => 0.5 - Math.random());
  }, [currentWord, allWords, direction]);

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

    setTimeout(() => {
      if (currentIndex < randomSet.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setShowResult(false);
      } else {
        setFinished(true);
      }
    }, 1200);
  };

  const handleNewSet = useCallback(() => {
    setSetKey(k => k + 1);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setShowResult(false);
    setFinished(false);
    setIncorrectWords([]);
    setShowWrongAnswersModal(false);
  }, []);

  const progressPercent = randomSet.length > 0 ? ((currentIndex + 1) / randomSet.length) * 100 : 0;

  if (finished) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center font-['Plus_Jakarta_Sans'] relative">
        <div className="bg-zinc-900 border border-emerald-500/20 p-10 rounded-[56px] shadow-2xl w-full max-w-sm relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <CheckCircle className="text-emerald-500 w-20 h-20 mx-auto mb-6 animate-bounce" />
          <h2 className="text-4xl font-black text-white mb-2">Harika İş!</h2>
          <p className="text-slate-500 font-bold mb-8">Testi başarıyla tamamladın.</p>

          <div className="mb-8 space-y-3">
            <div className="flex flex-col items-center">
              <span className="text-7xl font-black text-emerald-500 tracking-tighter">{score}</span>
              <span className="text-emerald-900 text-sm font-black uppercase tracking-widest">Puan</span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Doğru Sayısı</p>
                  <p className="text-xl font-black text-white">{score / 10} / {randomSet.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Başarı Oranı</p>
                  <p className="text-xl font-black text-emerald-500">%{Math.round(((score / 10) / randomSet.length) * 100)}</p>
                </div>
              </div>
              
              {incorrectWords.length > 0 && (
                <button
                  onClick={() => setShowWrongAnswersModal(true)}
                  className="text-xs font-bold text-red-400 hover:text-red-350 transition-all underline decoration-red-500/50 underline-offset-4 mt-2 block mx-auto hover:scale-105 active:scale-95 cursor-pointer"
                >
                  Yanlışları görmek için tıkla
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleNewSet}
              className="w-full bg-white text-black py-4 rounded-3xl font-black text-base hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} /> Yeni Set ile Devam Et
            </button>

            {onGoToFlashcards && (
              <button
                onClick={onGoToFlashcards}
                className="w-full py-4 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-3xl font-black text-base hover:bg-yellow-500 hover:text-black transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <BookOpen size={18} /> Kartlarla Çalış
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
      </div>
    );
  }

  if (!currentWord) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col font-['Plus_Jakarta_Sans'] relative overflow-hidden text-white">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500 opacity-20"></div>

      {/* Header */}
      <div className="w-full max-w-6xl mx-auto px-6 md:px-10 py-6 md:py-8 relative z-10">
        <div className="flex justify-between items-center w-full">
          <button onClick={onExit} className="p-4 bg-white/5 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all">
            <ArrowLeft size={24} />
          </button>

          {/* Büyük Sayaç */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-4xl font-black text-white tracking-tighter">
              {currentIndex + 1} <span className="text-slate-600 text-2xl">/ {randomSet.length}</span>
            </span>
            <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/5 px-6 py-3 rounded-full font-black text-emerald-400">
            <Zap size={16} fill="currentColor" />
            {score}
          </div>
        </div>
      </div>

      <div className="flex-1 px-8 flex flex-col justify-center max-w-lg mx-auto w-full relative z-10">

        <div className="flex justify-center items-center gap-3 mb-8">
          <button
            onClick={() => setDirection(d => d === LanguageDirection.EN_TR ? LanguageDirection.TR_EN : LanguageDirection.EN_TR)}
            className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-2 rounded-full text-emerald-500 font-black text-[10px] tracking-widest uppercase flex items-center gap-3 hover:bg-emerald-500/20 transition-all"
          >
            <Languages size={16} /> {direction.replace('_', ' → ')}
          </button>

          <button
            onClick={() => setIsTtsEnabled(prev => !prev)}
            className={`p-2.5 rounded-full border transition-all ${
              isTtsEnabled 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20" 
                : "bg-zinc-900 border-white/5 text-slate-500 hover:bg-zinc-800"
            }`}
            title={isTtsEnabled ? "Sesli Okuma Açık" : "Sesli Okuma Kapalı"}
          >
            {isTtsEnabled ? (
              <Volume2 size={16} />
            ) : (
              <div className="relative flex items-center justify-center">
                <VolumeX size={16} className="opacity-60" />
                <div className="absolute w-[18px] h-[1.5px] bg-slate-500 rotate-45" />
              </div>
            )}
          </button>
        </div>

        <div className="bg-zinc-900 rounded-[56px] p-12 border border-white/5 shadow-2xl mb-12 text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500/30 group-hover:h-3 transition-all"></div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
            {direction === LanguageDirection.TR_EN ? "İngilizce Karşılığı Nedir?" : "Türkçe Karşılığı Nedir?"}
          </p>
          <h2 className="text-5xl font-black text-white leading-tight tracking-tighter">
            {direction === LanguageDirection.EN_TR ? currentWord?.english : currentWord?.turkish}
          </h2>
        </div>

        <div className="space-y-4">
          {options.map((opt, idx) => {
            let btnClass = "w-full p-6 rounded-[32px] text-center font-black text-xl transition-all border-2 flex items-center justify-center min-h-[80px] ";
            const correct = direction === LanguageDirection.EN_TR ? currentWord.turkish : currentWord.english;

            if (showResult) {
              if (opt === correct) btnClass += "bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20 scale-105";
              else if (opt === selectedOption) btnClass += "bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/20";
              else btnClass += "bg-zinc-900/50 border-white/5 text-slate-600 opacity-50";
            } else {
              btnClass += "bg-zinc-900 border-white/5 text-slate-400 hover:border-emerald-500/50 hover:text-white hover:bg-zinc-800 active:scale-95";
            }

            return <button key={idx} onClick={() => handleSelect(opt)} disabled={showResult} className={btnClass}>{opt}</button>;
          })}
        </div>
      </div>

      <div className="pb-8"></div>
    </div>
  );
};

export default QuizMode;
