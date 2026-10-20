import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Clock, Volume2, Sparkles } from 'lucide-react';
import { AudioPhase } from '../services/audioStudyService';

interface ListeningModeBarProps {
    currentIndex: number;
    totalWords: number;
    isPlaying: boolean;
    isPaused: boolean;
    phase: AudioPhase;
    remainingDelay?: number;
    delaySeconds: number;
    onTogglePlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onClose: () => void;
    onDelayChange: (seconds: number) => void;
}

const ListeningModeBar: React.FC<ListeningModeBarProps> = ({
    currentIndex,
    totalWords,
    isPlaying,
    isPaused,
    phase,
    remainingDelay = 0,
    delaySeconds,
    onTogglePlayPause,
    onNext,
    onPrev,
    onClose,
    onDelayChange
}) => {
    const DELAY_OPTIONS = [3, 4, 5];

    const getPhaseBadge = () => {
        if (isPaused) {
            return (
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-zinc-800 text-slate-300 border border-white/10 flex items-center gap-1.5">
                    Duraklatıldı
                </span>
            );
        }

        switch (phase) {
            case 'front':
                return (
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse truncate">
                        <Volume2 size={11} className="shrink-0" /> <span className="truncate">Kelime Okunuyor</span>
                    </span>
                );
            case 'thinking':
                return (
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)] truncate">
                        <Clock size={11} className="animate-spin shrink-0" /> <span>Düşünme: {remainingDelay > 0 ? `${remainingDelay}s` : `${delaySeconds}s`}</span>
                    </span>
                );
            case 'back':
                return (
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 animate-pulse truncate">
                        <Volume2 size={11} className="shrink-0" /> <span className="truncate">Çeviri Okunuyor</span>
                    </span>
                );
            case 'transition':
                return (
                    <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 truncate">
                        <Sparkles size={11} className="shrink-0" /> <span className="truncate">Sıradakine Geçiliyor...</span>
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full max-w-md sm:max-w-xl mx-auto px-2.5 sm:px-4 mb-2 sm:mb-3 animate-fadeIn">
            <div className="bg-[#0b0c10]/95 backdrop-blur-2xl border border-white/15 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl relative overflow-hidden">
                {/* Glow Background Accent */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-12 bg-emerald-500/10 blur-2xl pointer-events-none rounded-full" />

                {/* Top Row: Status badge and delay options */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        {getPhaseBadge()}
                        <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 shrink-0">
                            {currentIndex + 1} / {totalWords}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 hidden sm:inline">Bekleme:</span>
                        <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/5">
                            {DELAY_OPTIONS.map(sec => (
                                <button
                                    key={sec}
                                    onClick={() => onDelayChange(sec)}
                                    className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black transition-all ${
                                        delaySeconds === sec
                                            ? 'bg-emerald-500 text-black shadow-md'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {sec}s
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1 sm:p-1.5 ml-0.5 sm:ml-1 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-xl transition-all"
                            title="Dinleme Modunu Kapat"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden mb-2.5 sm:mb-3 border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
                        style={{ width: `${((currentIndex + 1) / (totalWords || 1)) * 100}%` }}
                    />
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between px-1 sm:px-2">
                    <div className="text-[10px] font-bold text-slate-400 truncate max-w-[100px] sm:max-w-[200px]">
                        🎧 Hands-free
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={onPrev}
                            disabled={currentIndex === 0}
                            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-90"
                            title="Önceki Kelime"
                        >
                            <SkipBack size={18} />
                        </button>

                        <button
                            onClick={onTogglePlayPause}
                            className={`w-10 h-10 sm:w-11 sm:h-11 min-w-[36px] min-h-[36px] rounded-xl sm:rounded-2xl flex items-center justify-center font-black transition-all active:scale-95 shadow-xl ${
                                isPaused
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/25'
                                    : 'bg-white hover:bg-slate-200 text-black shadow-white/10'
                            }`}
                            title={isPaused ? 'Devam Et' : 'Duraklat'}
                        >
                            {isPaused ? <Play size={18} className="ml-0.5 fill-current" /> : <Pause size={18} className="fill-current" />}
                        </button>

                        <button
                            onClick={onNext}
                            disabled={currentIndex >= totalWords - 1}
                            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-all active:scale-90"
                            title="Sonraki Kelime"
                        >
                            <SkipForward size={18} />
                        </button>
                    </div>

                    <div className="text-[10px] font-black text-emerald-400/90 hidden sm:block">
                        Arka Planda Çalar
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ListeningModeBar;
