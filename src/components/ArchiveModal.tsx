
import React from 'react';
import { Archive, X } from 'lucide-react';

interface ArchiveModalProps {
    onConfirm: () => void;
    onCancel: () => void;
    title?: string;
    description?: string;
}

const ArchiveModal: React.FC<ArchiveModalProps> = ({
    onConfirm,
    onCancel,
    title = "Arşivle",
    description = "Bu kelimeyi arşive göndermek istediğine emin misin? Daha sonra tekrar aktif edebilirsin."
}) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] animate-fadeIn">
            <div className="bg-[#0a0a0a] w-full max-w-md rounded-[40px] p-8 border border-white/10 shadow-2xl relative">
                <button
                    onClick={onCancel}
                    className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-slate-700 text-slate-400 rounded-full transition-all z-50 active:scale-90"
                >
                    <X size={20} strokeWidth={2.5} />
                </button>

                <div className="text-center mb-8 mt-4">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Archive size={40} className="text-blue-500 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">{title}</h2>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed px-4">
                        {description}
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 p-5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-3xl font-black transition-all active:scale-95 border border-white/5"
                    >
                        Vazgeç
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 p-5 bg-blue-600 hover:bg-blue-500 text-white rounded-3xl font-black transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                    >
                        Evet, Arşivle
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ArchiveModal;
