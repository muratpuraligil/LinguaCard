
import React from 'react';
import { Word, AppMode } from '../types';
import WordList from './WordList';
import GradientText from './GradientText';
import Aurora from './Aurora';
import AnimatedCard from './AnimatedCard';
import { BookOpen, Puzzle, Sparkles, Plus, LogOut, Download, Image, Book, Archive, X, Library, User } from 'lucide-react';

interface DashboardProps {
  userEmail?: string;
  words: Word[];
  onModeSelect: (mode: AppMode) => void;
  onAddWord: (english: string, turkish: string, example: string, turkish_sentence: string) => Promise<boolean>;
  onDeleteWord: (id: string) => void;
  onDeleteByDate: (date: string) => void;
  onLogout: () => void;
  onArchiveWord: (id: string) => void;
  onOpenUpload: () => void;
  onQuickAdd: () => void;
  onResetAccount: () => void;
  onLoadDemo: () => void;
  onClearDemo: () => void;
  isDemoActive: boolean;
  showTour: boolean;
  onTourComplete: () => void;
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
  onArchiveWord,
  onResetAccount,
  onLoadDemo,
  onClearDemo,
  isDemoActive,
  showTour,
  onTourComplete
}) => {
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (showTour) {
      onTourComplete();
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 flex justify-center">
      <div className="w-full max-w-6xl bg-black min-h-screen border-x border-white/5 relative">
        <div className="px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3.5 group">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-600/20 animate-float">
              <BookOpen size={22} strokeWidth={2.5} className="text-white fill-white/10" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none">LinguaCard</h1>
              <p className="text-slate-500 text-[9px] font-extrabold tracking-[0.08em] uppercase mt-1 pl-0.5">Yapay Zeka Destekli Kelime Öğrenme Platformu</p>
            </div>
          </div>

          <div className="flex items-center gap-3" ref={menuRef}>
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl border border-white/10 hover:brightness-110 transition-all duration-300 active:scale-95 flex items-center justify-center shadow-md shadow-blue-600/20 font-black text-base"
              >
                {userEmail ? userEmail[0].toUpperCase() : <User size={18} />}
              </button>

              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-3 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]">
                  {/* User Header */}
                  <div className="px-4 py-4 border-b border-white/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-lg flex-shrink-0">
                      {userEmail ? userEmail[0].toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aktif Hesap</p>
                      <p className="text-xs font-bold text-white truncate">{userEmail || 'Kullanıcı'}</p>
                    </div>
                  </div>
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        if (isDemoActive) onClearDemo();
                        else onLoadDemo();
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left group"
                    >
                      <Sparkles size={18} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-200">
                        {isDemoActive ? "Demo'dan Çık" : "Demoya Dön"}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        onModeSelect(AppMode.ARCHIVE);
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left group"
                    >
                      <Archive size={18} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-200">Arşiv'e git</span>
                    </button>

                    <div className="h-px bg-white/5 my-1" />

                    <button
                      onClick={() => {
                        onLogout();
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors text-left group"
                    >
                      <LogOut size={18} className="text-red-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-red-500">Çıkış Yap</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 mb-5">
          <div className="relative group shadow-xl rounded-2xl">


            {/* Background Effect */}
            {/* Background Container - Clipped */}
            <div className="absolute inset-0 z-0 bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden">
              <div className="absolute inset-0 z-0 pointer-events-none">
                <Aurora
                  colorStops={['#4ade80', '#60a5fa', '#a855f7']}
                  amplitude={1.0}
                  speed={0.5}
                  blend={0.5}
                />
              </div>

              {/* Animated Book and Words Text inside the clipped area */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center group-hover:scale-110 transition-transform duration-700 select-none pointer-events-none">
                <div className="relative flex items-center justify-center">
                  <span className="absolute text-[8px] font-black uppercase tracking-[0.4em] text-white z-10 drop-shadow-2xl">words</span>
                  <Book size={56} strokeWidth={1} className="text-white/20 animate-pulse -rotate-12" />
                </div>
              </div>
            </div>

            <div className="relative z-10 p-5 md:p-6">
              <div className="mb-1.5">
                <h2 className="text-xl font-black tracking-tight text-white mb-1 z-10 relative drop-shadow-md">
                  Hadi Pratik Yapalım!
                </h2>
              </div>
              <p className="text-blue-200/70 font-medium text-xs mb-4 flex flex-col md:block leading-relaxed">
                <span>Kelime listende aktif <span className="text-yellow-400 font-black text-base mx-1">{words.length}</span> kelime var.</span>
                <span className="mt-1 md:mt-0 md:ml-1 block md:inline">
                  Yeni kelime yüklemek için <span className="font-bold text-white">AI ile Yükle</span> yada <span className="font-bold text-white">Manuel Ekle</span>'yi kullan.
                </span>
              </p>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={onOpenUpload}
                    className="group bg-white text-black px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 hover:bg-blue-600 hover:text-white hover:shadow-blue-600/30 hover:scale-105 transition-all duration-300 shadow-md relative z-20"
                  >
                    <div className="w-5 h-5 bg-black/5 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <Image size={13} />
                    </div>
                    AI ile Yükle
                  </button>
                </div>

                <div className="relative">
                  <button
                    onClick={onQuickAdd}
                    className="group bg-zinc-800 text-slate-300 border border-white/10 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 hover:bg-white hover:text-black hover:border-white transition-all duration-300 shadow-md hover:shadow-white/20 active:scale-95"
                  >
                    <div className="w-5 h-5 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-black/10 transition-colors">
                      <Plus size={13} />
                    </div>
                    Manuel Ekle
                  </button>
                </div>

                {words.length === 0 && (
                  <div className="relative animate-fadeIn ml-2">
                    <button
                      onClick={onLoadDemo}
                      className="group bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 hover:scale-105 transition-all duration-300 shadow-md shadow-purple-600/30 border border-white/20"
                    >
                      <Sparkles size={14} className="group-hover:animate-spin" /> Demo Veri Yükle
                    </button>

                  </div>
                )}
              </div>
            </div>


          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 mb-8 perspective-1000">
          <AnimatedCard
            onClick={() => {
              onModeSelect(AppMode.FLASHCARDS);
            }}
            className="rounded-2xl border-b-4 border-yellow-500 bg-zinc-900/80"
            glowColor="#eab308"
            delay={0.1}
          >
            <div className="p-4 sm:p-5 h-full flex flex-col items-start relative z-20">
              <div className="bg-yellow-500/10 w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-yellow-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"><BookOpen size={20} /></div>
              <h3 className="text-base font-black mb-1 text-white group-hover:text-yellow-400 transition-colors">Kartlar</h3>
              <p className="text-xs text-slate-400 font-medium leading-snug">20 kelimelik setler halinde çalış.</p>
            </div>
          </AnimatedCard>

          <AnimatedCard
            onClick={() => {
              onModeSelect(AppMode.QUIZ);
            }}
            className="rounded-2xl border-b-4 border-emerald-500 bg-zinc-900/80"
            glowColor="#10b981"
            delay={0.2}
          >
            <div className="p-4 sm:p-5 h-full flex flex-col items-start relative z-20">
              <div className="bg-emerald-500/10 w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-emerald-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6"><Puzzle size={20} /></div>
              <h3 className="text-base font-black mb-1 text-white group-hover:text-emerald-400 transition-colors">Test Çöz</h3>
              <p className="text-xs text-slate-400 font-medium leading-snug">Öğrendiklerini test ederek puan topla.</p>
            </div>
          </AnimatedCard>

          <AnimatedCard
            onClick={() => {
              onModeSelect(AppMode.SENTENCES);
            }}
            className="rounded-2xl border-b-4 border-purple-500 bg-zinc-900/80"
            glowColor="#a855f7"
            delay={0.3}
            showNewBadge={true}
          >
            <div className="p-4 sm:p-5 h-full flex flex-col items-start relative z-20">
              <div className="flex items-center justify-between w-full mb-3">
                <div className="bg-purple-500/10 w-10 h-10 rounded-xl flex items-center justify-center text-purple-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <Sparkles size={20} />
                </div>
                {(() => {
                  const maxReached = parseInt(localStorage.getItem('lingua_sentence_max_reached') || '0');
                  const total = words.filter(w => w.example_sentence && w.example_sentence.length > 3).length;
                  if (maxReached >= total && total > 0) {
                    return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Tamamlandı</span>;
                  } else if (maxReached > 0) {
                    return <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20">Devam Ediyor</span>;
                  }
                  return null;
                })()}
              </div>
              <h3 className="text-base font-black mb-1 text-white group-hover:text-purple-400 transition-colors">Cümleler</h3>
              <p className="text-xs text-slate-400 font-medium leading-snug">Cümle kurma pratiği yap.</p>
            </div>
          </AnimatedCard>

        </div>

        <div className="px-6 pt-2 pb-2">
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2.5">
            <span className="w-1 h-5 bg-blue-500 rounded-full" />
            Kelime Listem
          </h2>
        </div>

        <div className="px-6 pb-16">
          <WordList words={words} onDelete={onDeleteWord} onDeleteByDate={onDeleteByDate} onAdd={onAddWord} onOpenUpload={onOpenUpload} onArchive={onArchiveWord} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
