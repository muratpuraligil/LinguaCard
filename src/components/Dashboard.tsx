
import React from 'react';
import { Word, AppMode } from '../types';
import WordList from './WordList';
import GradientText from './GradientText';
import Aurora from './Aurora';
import AnimatedCard from './AnimatedCard';
import { BookOpen, Puzzle, Sparkles, Plus, LogOut, Download, Image, Book, Archive, Bot, X, Library, User } from 'lucide-react';

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
  const [tourStep, setTourStep] = React.useState(showTour ? 1 : 0);
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
        <div className="p-8 flex justify-between items-center">
          <div className="flex items-center gap-5 group">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 animate-float">
              <BookOpen size={32} strokeWidth={2.5} className="text-white fill-white/10" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter leading-none">LinguaCard</h1>
              <p className="text-slate-500 text-[10px] font-extrabold tracking-[0.1em] uppercase mt-1 pl-0.5">Yapay Zeka Destekli Kelime Öğrenme Platformu</p>
            </div>
          </div>

          <div className="flex items-center gap-4" ref={menuRef}>
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl border border-white/10 hover:brightness-110 transition-all duration-300 active:scale-95 flex items-center justify-center shadow-lg shadow-blue-600/20 font-black text-xl"
              >
                {userEmail ? userEmail[0].toUpperCase() : <User size={24} />}
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
                      <span className="text-xs font-bold text-slate-200">Arşivle</span>
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

                  {/* AI Tooltip 1 - Step 1 */}
                  {tourStep === 1 && (
                    <div
                      className="absolute top-full right-0 mt-4 w-80 bg-white border border-blue-200 p-5 rounded-2xl shadow-xl shadow-blue-900/10 z-50 animate-pulse cursor-pointer origin-top-right transition-all hover:scale-[1.02] active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTourStep(2);
                      }}
                    >
                      {/* Skip/Close Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setTourStep(0); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-200 hover:text-slate-600 transition-colors shadow-md z-[60]"
                      >
                        <X size={12} />
                      </button>
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl flex-shrink-0">
                          <Bot size={22} />
                        </div>
                        <div className="flex-1">
                          <p className="text-blue-900 text-[12px] font-bold leading-snug">
                            Kelime listeni yapıştır yada resim olarak yükle, AI örnek cümleler ile listene eklesin...
                          </p>
                          <div className="mt-3 flex justify-end">
                            <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-1 rounded-md uppercase tracking-tighter">İleri (1/3)</span>
                          </div>
                        </div>
                      </div>
                      <div className="absolute -top-2 right-12 w-4 h-4 bg-white border-t border-l border-blue-200 rotate-45"></div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={onQuickAdd}
                    className="group bg-zinc-800 text-slate-300 border border-white/10 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-3 hover:bg-white hover:text-black hover:border-white transition-all duration-300 shadow-lg hover:shadow-white/20 active:scale-95"
                  >
                    <div className="w-6 h-6 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-black/10 transition-colors">
                      <Plus size={14} />
                    </div>
                    Hızlı Ekle
                  </button>

                  {/* AI Tooltip 2 - Step 2 */}
                  {tourStep === 2 && (
                    <div
                      className="absolute top-full left-0 mt-4 w-80 bg-white border border-purple-200 p-5 rounded-2xl shadow-xl shadow-purple-900/10 z-50 animate-pulse cursor-pointer origin-top-left transition-all hover:scale-[1.02] active:scale-95"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (words.length === 0) {
                          setTourStep(3);
                        } else {
                          setTourStep(0);
                        }
                      }}
                    >
                      {/* Skip/Close Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setTourStep(0); }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-200 hover:text-slate-600 transition-colors shadow-md z-[60]"
                      >
                        <X size={12} />
                      </button>
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-xl flex-shrink-0">
                          <Bot size={22} />
                        </div>
                        <div className="flex-1">
                          <p className="text-purple-900 text-[12px] font-bold leading-snug">
                            Sadece kelimeni yaz, AI kelime karşılığını ve örnek cümleleri tamamlasın.
                          </p>
                          <div className="mt-3 flex justify-end">
                            <span className="text-[9px] font-black bg-purple-600 text-white px-2 py-1 rounded-md uppercase tracking-tighter">
                              {words.length === 0 ? "Sıradaki (2/3)" : "Bitir"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="absolute -top-2 left-10 w-4 h-4 bg-white border-t border-l border-purple-200 rotate-45"></div>
                    </div>
                  )}
                </div>

                {words.length === 0 && (
                  <div className="relative animate-fadeIn ml-2">
                    <button
                      onClick={onLoadDemo}
                      className="group bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-3 hover:scale-105 transition-all duration-300 shadow-xl shadow-purple-600/30 border border-white/20"
                    >
                      <Sparkles size={16} className="group-hover:animate-spin" /> Demo Veri Yükle
                    </button>

                    {/* AI Tooltip 3 - Step 3 (Demo) */}
                    {tourStep === 3 && (
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 bg-white border border-indigo-200 p-5 rounded-2xl shadow-xl shadow-indigo-900/10 z-50 animate-pulse cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTourStep(0);
                        }}
                      >
                        {/* Skip/Close Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setTourStep(0); }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-200 hover:text-slate-600 transition-colors shadow-md z-[60]"
                        >
                          <X size={12} />
                        </button>
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl flex-shrink-0">
                            <Bot size={22} />
                          </div>
                          <div className="flex-1">
                            <p className="text-indigo-900 text-[12px] font-bold leading-snug">
                              Demo veriler ile platformu deneyebilirsin.
                            </p>
                            <div className="mt-3 flex justify-end">
                              <span className="text-[9px] font-black bg-indigo-600 text-white px-2 py-1 rounded-md uppercase tracking-tighter">Anladım (3/3)</span>
                            </div>
                          </div>
                        </div>
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-indigo-200 rotate-45"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 mb-10 perspective-1000">
          <AnimatedCard
            onClick={() => {
              if (words.length === 0) {
                alert("Öğrenilecek kelime bulunamadı! Lütfen önce kütüphanenize kelime ekleyin.");
                return;
              }
              onModeSelect(AppMode.FLASHCARDS);
            }}
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
            onClick={() => {
              if (words.length === 0) {
                alert("Test edilecek kelime bulunamadı! Lütfen önce kütüphanenize kelime ekleyin.");
                return;
              }
              onModeSelect(AppMode.QUIZ);
            }}
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
            onClick={() => {
              if (words.length === 0) {
                alert("Çalışılacak kelime bulunamadı! Lütfen önce kütüphanenize kelime ekleyin.");
                return;
              }
              onModeSelect(AppMode.SENTENCES);
            }}
            className="rounded-[32px] border-b-4 border-purple-500 bg-zinc-900/80"
            glowColor="#a855f7"
            delay={0.3}
          >
            <div className="p-6 h-full flex flex-col items-start relative z-20">
              <div className="flex items-center justify-between w-full mb-6">
                <div className="bg-purple-500/10 w-12 h-12 rounded-2xl flex items-center justify-center text-purple-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <Sparkles size={24} />
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
