import React from 'react';
import { X, Sparkles, Layers } from 'lucide-react';

interface SentenceModeSelectionModalProps {
  onClose: () => void;
  onSelectStandard: () => void;
  onSelectCustom: () => void;
  onSelectLibrary: () => void;
}

const SentenceModeSelectionModal: React.FC<SentenceModeSelectionModalProps> = ({
  onClose,
  onSelectStandard,
  onSelectCustom,
  onSelectLibrary
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] animate-fadeIn">
      <div className="bg-[#0a0a0a] w-full max-w-4xl rounded-[32px] p-6 md:p-8 border border-white/10 shadow-2xl relative">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-500 hover:text-white text-slate-400 rounded-full transition-all z-50 active:scale-90"
        >
          <X size={18} strokeWidth={3} />
        </button>

        <div className="text-center mb-8 mt-2">
          <h2 className="text-2xl md:text-4xl font-black text-white mb-2 tracking-tight">Cümle Çalışma Modunu Seç</h2>
          <p className="text-slate-400 font-bold text-base">Nasıl pratik yapmak istersin?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={onSelectStandard}
            className="p-8 bg-purple-600/10 hover:bg-purple-600 hover:text-white text-purple-400 rounded-[32px] flex flex-col items-center gap-5 transition-all group active:scale-95 border border-purple-500/20"
          >
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all">
              <Sparkles size={32} strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <span className="block font-black text-xl mb-1">Listendeki Kelimelerle Çalış</span>
              <span className="text-sm font-bold opacity-70">Kelime listeni kullanır.</span>
            </div>
          </button>

          <button
            onClick={onSelectCustom}
            className="p-8 bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-400 rounded-[32px] flex flex-col items-center gap-5 transition-all group active:scale-95 border border-blue-500/20"
          >
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all">
              <Layers size={32} strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <span className="block font-black text-xl mb-1">Yeni Cümlelerle Çalış</span>
              <span className="text-sm font-bold opacity-70">Resim yükleyerek çalış</span>
            </div>
          </button>

          <button
            onClick={onSelectLibrary}
            className="p-8 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded-[32px] flex flex-col items-center gap-5 transition-all group active:scale-95 border border-emerald-500/20"
          >
            <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-all">
              <Sparkles size={32} strokeWidth={2.5} className="rotate-12" />
            </div>
            <div className="text-center">
              <span className="block font-black text-xl mb-1">Kütüphaneden Çalış</span>
              <span className="text-sm font-bold opacity-70">Sistemdeki cümleleri kullan</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SentenceModeSelectionModal;