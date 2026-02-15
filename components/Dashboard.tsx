
import React from 'react';
import { Word, AppMode } from '../types';
import WordList from './WordList';
import GradientText from './GradientText';
import Aurora from './Aurora';
import AnimatedCard from './AnimatedCard';
import { BookOpen, Puzzle, Sparkles, Plus, LogOut, Download, Image, Book, Archive, Bot } from 'lucide-react';

interface DashboardProps {
  userEmail?: string;
  words: Word[];
  onModeSelect: (mode: AppMode) => void;
  onAddWord: (english: string, turkish: string, example: string, turkish_sentence: string) => Promise<boolean>;
  onDeleteWord: (id: string) => void;
  onDeleteByDate: (date: string) => void;
  onLogout: () => void;
  onOpenUpload: () => void;
  onQuickAdd: () => void;
  onResetAccount: () => void;
  onArchiveWord: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  userEmail,
  words,
  onModeSelect,
  onAddWord,
  onDeleteWord,
  onDeleteByDate,
  onLogout,
  onOpenUpload,
  onQuickAdd,
  onArchiveWord
}) => {
  const [showAiTooltip, setShowAiTooltip] = React.useState(true);

  React.useEffect(() => {
    const handleClick = () => setShowAiTooltip(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 flex justify-center">
      <div className="w-full max-w-6xl bg-black min-h-screen border-x border-white/5 relative">
        <div className="p-8 flex justify-between items-center">
          <div className="flex items-center gap-5 group">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 animate-float">
              <BookOpen size={32} strokeWidth={2.5} className="text-white fill-white/10" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter leading-none">LinguaCard</h1>
              <p className="text-slate-500 text-[11px] font-extrabold tracking-[0.25em] uppercase mt-1 pl-0.5">Kelime Öğren</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Arşiv Button */}
            <div className="relative group">
              <button
                onClick={() => onModeSelect(AppMode.ARCHIVE)}
                className="p-4 bg-zinc-900/50 backdrop-blur-md text-slate-400 rounded-2xl border border-white/10 hover:bg-indigo-600 hover:border-indigo-500/50 hover:text-white transition-all duration-300 active:scale-95 shadow-lg group-hover:shadow-indigo-500/20"
              >
                <Archive size={22} className="transition-transform group-hover:scale-110" />
              </button>
              <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 pointer-events-none whitespace-nowrap border border-white/10 shadow-xl z-50">
                Arşiv
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-t border-l border-white/10 rotate-45"></div>
              </div>
            </div>

            {/* Çıkış Button */}
            <div className="relative group">
              <button
                onClick={onLogout}
                className="p-4 bg-red-500/5 text-red-500/70 rounded-2xl border border-red-500/10 hover:bg-red-600 hover:text-white hover:border-red-500/50 transition-all duration-300 active:scale-95 shadow-lg group-hover:shadow-red-600/20"
              >
                <LogOut size={22} className="transition-transform group-hover:scale-110" />
              </button>
              <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 pointer-events-none whitespace-nowrap border border-white/10 shadow-xl z-50">
                Çıkış Yap
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-t border-l border-white/10 rotate-45"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 my-6">
          <div className="relative group shadow-2xl rounded-[32px]">


            {/* Background Effect */}
            {/* Background Container - Clipped */}
            <div className="absolute inset-0 z-0 bg-zinc-900 rounded-[32px] border border-white/10 overflow-hidden">
              <div className="absolute inset-0 z-0 pointer-events-none">
                <Aurora
                  colorStops={['#4ade80', '#60a5fa', '#a855f7']}
                  amplitude={1.0}
                  speed={0.5}
                  blend={0.5}
                />
              </div>

              {/* Animated Book and Words Text inside the clipped area */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-center group-hover:scale-110 transition-transform duration-700 select-none pointer-events-none">
                <div className="relative flex items-center justify-center">
                  <span className="absolute text-[9px] font-black uppercase tracking-[0.4em] text-white z-10 drop-shadow-2xl">words</span>
                  <Book size={80} strokeWidth={1} className="text-white/20 animate-pulse -rotate-12" />
                </div>
              </div>
            </div>

            <div className="relative z-10 p-6 md:p-8">
              <div className="mb-2">
                <h2 className="text-2xl font-black tracking-tight text-white mb-1 z-10 relative drop-shadow-md">
                  Hadi Pratik Yapalım!
                </h2>
              </div>
              <p className="text-blue-200/70 font-medium text-sm mb-6 flex flex-col md:block leading-relaxed">
                <span>Kütüphanende aktif <span className="text-yellow-400 font-black text-lg mx-1">{words.length}</span> kelime var.</span>
                <span className="mt-2 md:mt-0 md:ml-1 block md:inline">
                  Yeni kelime yüklemek için <span className="font-bold text-white">Resim ile Yükle</span> yada <span className="font-bold text-white">Hızlı Ekle</span>'yi kullan.
                </span>
              </p>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <button
                    onClick={onOpenUpload}
                    className="group bg-white text-black px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-3 hover:bg-blue-600 hover:text-white hover:shadow-blue-600/30 hover:scale-105 transition-all duration-300 shadow-xl relative z-20"
                  >
                    <div className="w-6 h-6 bg-black/5 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <Image size={14} />
                    </div>
                    Resim ile Yükle
                  </button>

                  {/* AI Tooltip */}
                  {showAiTooltip && (
                    <div className="absolute top-full left-0 mt-4 w-96 bg-white border border-blue-200 p-5 rounded-2xl shadow-xl shadow-blue-900/10 z-50 animate-pulse cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowAiTooltip(false); }}>
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl flex-shrink-0">
                          <Bot size={22} />
                        </div>
                        <div>
                          <p className="text-blue-900 text-[13px] font-bold leading-snug">
                            Resimler Yapay zeka ile analiz edilir, kelimeler örnek cümleler ile birlikte listeye eklenir.
                          </p>
                        </div>
                      </div>
                      <div className="absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-blue-200 rotate-45"></div>
                    </div>
                  )}
                </div>
                <button
                  onClick={onQuickAdd}
                  className="group bg-zinc-800 text-slate-300 border border-white/10 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-3 hover:bg-white hover:text-black hover:border-white transition-all duration-300 shadow-lg hover:shadow-white/20 active:scale-95"
                >
                  <div className="w-6 h-6 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-black/10 transition-colors">
                    <Plus size={14} />
                  </div>
                  Hızlı Ekle
                </button>
              </div>
            </div>


          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 mb-10 perspective-1000">
          <AnimatedCard
            onClick={() => onModeSelect(AppMode.FLASHCARDS)}
            className="rounded-[32px] border-b-4 border-yellow-500 bg-zinc-900/80"
            glowColor="#eab308"
            delay={0.1}
          >
            <div className="p-6 h-full flex flex-col items-start relative z-20">
              <div className="bg-yellow-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-yellow-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"><BookOpen size={24} /></div>
              <h3 className="text-xl font-black mb-2 text-white group-hover:text-yellow-400 transition-colors">Kartlar</h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">20 kelimelik setler halinde çalış.</p>
            </div>
          </AnimatedCard>

          <AnimatedCard
            onClick={() => onModeSelect(AppMode.QUIZ)}
            className="rounded-[32px] border-b-4 border-emerald-500 bg-zinc-900/80"
            glowColor="#10b981"
            delay={0.2}
          >
            <div className="p-6 h-full flex flex-col items-start relative z-20">
              <div className="bg-emerald-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-emerald-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"><Puzzle size={24} /></div>
              <h3 className="text-xl font-black mb-2 text-white group-hover:text-emerald-400 transition-colors">Test Çöz</h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">Öğrendiklerini test ederek puan topla.</p>
            </div>
          </AnimatedCard>

          <AnimatedCard
            onClick={() => onModeSelect(AppMode.SENTENCES)}
            className="rounded-[32px] border-b-4 border-purple-500 bg-zinc-900/80"
            glowColor="#a855f7"
            delay={0.3}
          >
            <div className="p-6 h-full flex flex-col items-start relative z-20">
              <div className="bg-purple-500/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-purple-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"><Sparkles size={24} /></div>
              <h3 className="text-xl font-black mb-2 text-white group-hover:text-purple-400 transition-colors">Cümleler</h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">Cümle kurma pratiği yap.</p>
            </div>
          </AnimatedCard>
        </div>

        <div className="px-8 pb-20">
          <WordList words={words} onDelete={onDeleteWord} onDeleteByDate={onDeleteByDate} onAdd={onAddWord} onOpenUpload={onOpenUpload} onArchive={onArchiveWord} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
