import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';
import { libraryData } from '../data/libraryData';
import { LibrarySet } from '../types';

interface LibraryScreenProps {
  onExit: () => void;
  onSelectSet: (set: LibrarySet) => void;
  onRandomCreate: () => void;
}

const LibraryScreen: React.FC<LibraryScreenProps> = ({ onExit, onSelectSet, onRandomCreate }) => {
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const newProgress: Record<string, number> = {};
    libraryData.forEach(cat => {
      cat.sets.forEach(set => {
        // Yeni format: library_completed_{id}_{direction} -> bir nesne { sentenceId: true }
        const trEnStr = localStorage.getItem(`library_completed_${set.id}_TR_EN`);
        const enTrStr = localStorage.getItem(`library_completed_${set.id}_EN_TR`);
        
        let trEnCount = 0;
        let enTrCount = 0;

        if (trEnStr) {
          try { trEnCount = Object.keys(JSON.parse(trEnStr)).length; } catch {}
        }
        if (enTrStr) {
          try { enTrCount = Object.keys(JSON.parse(enTrStr)).length; } catch {}
        }

        // Eski format desteği (Migration için)
        if (trEnCount === 0) {
          trEnCount = parseInt(localStorage.getItem(`library_progress_${set.id}_TR_EN`) || '0', 10);
        }
        if (enTrCount === 0) {
          enTrCount = parseInt(localStorage.getItem(`library_progress_${set.id}_EN_TR`) || '0', 10);
        }

        const maxProgress = Math.max(trEnCount, enTrCount);
        if (maxProgress > 0) {
          newProgress[set.id] = maxProgress;
        }
      });
    });
    setProgressMap(newProgress);
  }, []);

  const handleRandomCreate = () => {
    onRandomCreate();
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onExit}
            className="p-3 bg-zinc-900/50 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all duration-300"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black">LinguaCard Yardımcı Fiiller ve Kip(Modal) Fiiller</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Kütüphane Kaynakları</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-20">
        {/* Random Creator Button Area */}
        <div className="flex justify-center mb-16">
          <button
            onClick={handleRandomCreate}
            className="group relative px-8 py-4 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden transition-all duration-500 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <ChevronRight size={20} className="rotate-[-45deg] group-hover:rotate-0 transition-transform" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-black text-white tracking-wide uppercase">Rastgele Oluştur</span>
                <span className="text-[10px] text-slate-500 font-bold group-hover:text-blue-400/70 transition-colors uppercase tracking-widest">34 Ana Gruptan Seçmeler</span>
              </div>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {libraryData.map((category, idx) => {
            const isFirst = idx === 0;
            const bgClass = isFirst ? 'bg-blue-950/10 border-blue-900/30' : 'bg-purple-950/10 border-purple-900/30';
            const iconBgClass = isFirst ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500';
            const hoverBorderClass = isFirst ? 'hover:border-blue-500/30' : 'hover:border-purple-500/30';
            const hoverTextClass = isFirst ? 'group-hover:text-blue-400' : 'group-hover:text-purple-400';
            const hoverIconBgClass = isFirst ? 'group-hover:bg-blue-500/20 group-hover:text-blue-400' : 'group-hover:bg-purple-500/20 group-hover:text-purple-400';
            
            return (
              <div key={idx} className={`flex flex-col p-8 rounded-[32px] border ${bgClass}`}>
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBgClass}`}>
                    <BookOpen size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-white">{category.title}</h2>
                </div>
                
                <div className="flex flex-col gap-4">
                  {category.sets.map((set) => {
                    const progress = progressMap[set.id] || 0;
                    const isCompleted = progress >= set.sentences.length && set.sentences.length > 0;
                    const inProgress = progress > 0 && progress < set.sentences.length;

                    return (
                    <button
                      key={set.id}
                      onClick={() => onSelectSet(set)}
                      className={`group bg-black/40 border border-white/5 ${hoverBorderClass} p-5 rounded-2xl flex items-center justify-between transition-all duration-300 hover:bg-black/60 active:scale-[0.98]`}
                    >
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold text-slate-200 ${hoverTextClass} transition-colors`}>{set.title}</span>
                          {isCompleted ? (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                              Tamamlandı
                            </span>
                          ) : inProgress ? (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20">
                              Devam Ediyor
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs text-slate-500 font-medium mt-1">
                          {progress > 0 ? `${progress} / ` : ''}{set.sentences.length} Cümle
                        </span>
                      </div>
                      <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center ${hoverIconBgClass} transition-colors`}>
                        <ChevronRight size={16} />
                      </div>
                    </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LibraryScreen;
