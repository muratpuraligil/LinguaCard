
import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, X, Keyboard, Sparkles, RotateCcw, Clock, AlertTriangle, Zap } from 'lucide-react';
import { PulseLoader } from './Loader';
import { OcrStatus } from '../types';

interface UploadModalProps {
    onClose: () => void;
    onFileSelect: (input: File | string) => void;
    isLoading: boolean;
    onCancelLoading?: () => void;
    showToast?: (message: string, type: 'success' | 'error' | 'warning') => void;
    ocrStatus: OcrStatus;
}

const COOLDOWN_MS = 3_000;

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onFileSelect, isLoading, onCancelLoading, showToast, ocrStatus }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [pastedText, setPastedText] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleFileChange = useCallback((file: File) => {
        if (isLoading) return;
        setSelectedFile(file);
        setPastedText(null);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    }, [isLoading]);

    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (isLoading) return;
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) handleFileChange(file);
                    break;
                } else if (item.type === 'text/plain') {
                    item.getAsString((text) => {
                        if (isLoading) return;
                        setPastedText(text);
                        setSelectedFile(null);
                        setPreviewUrl('text-preview');
                    });
                    break;
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [handleFileChange, isLoading, previewUrl]);

    const startAnalysis = () => {
        if ((!selectedFile && !pastedText) || isLoading) return;

        const lastCall = localStorage.getItem('lingua_last_ai_call');
        const now = Date.now();

        if (lastCall) {
            const timePassed = now - parseInt(lastCall);
            if (timePassed < COOLDOWN_MS) {
                const remaining = Math.ceil((COOLDOWN_MS - timePassed) / 1000);
                showToast?.(`Lütfen ${remaining} saniye bekleyin.`, 'warning');
                return;
            }
        }

        localStorage.setItem('lingua_last_ai_call', now.toString());
        onFileSelect(pastedText || selectedFile!);
    };

    const resetSelection = () => {
        setSelectedFile(null);
        setPastedText(null);
        setPreviewUrl(null);
    };

    const statusMap: Record<OcrStatus, { text: string; icon: React.ReactNode }> = {
        PREPARING: {
            text: "Görsel hazırlanıyor...",
            icon: <RotateCcw size={16} className="animate-spin" />
        },
        CONNECTING: {
            text: "Yapay zeka ile bağlantı kuruluyor...",
            icon: <Zap size={16} className="text-yellow-400 animate-pulse" />
        },
        ANALYZING: {
            text: "Kelimeler çıkarılıyor...",
            icon: <Sparkles size={16} className="text-blue-400 animate-pulse" />
        },
        IDLE: {
            text: "Başlatılıyor...",
            icon: <Clock size={16} />
        }
    };

    const currentStatus = statusMap[ocrStatus] || statusMap.IDLE;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-[#0a0a0a] w-full max-w-lg rounded-[48px] p-10 border border-white/10 shadow-2xl relative overflow-hidden">

                {!isLoading && (
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-red-500 hover:text-white text-slate-400 rounded-full transition-all active:scale-90 z-50"
                    >
                        <X size={24} strokeWidth={2.5} />
                    </button>
                )}

                {!previewUrl ? (
                    <>
                        <div className="text-center mb-8 mt-4">
                            <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-3xl shadow-[0_0_30px_rgba(124,58,237,0.3)] animate-float">
                                <Sparkles size={40} className="text-white animate-pulse" />
                                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 opacity-30 blur-sm -z-10 animate-pulse"></div>
                            </div>
                            <h2 className="text-3xl font-black text-white mb-4 tracking-tight flex items-center justify-center gap-2">
                                <span>Kelime Yükle</span>
                                <span className="text-[10px] font-black tracking-widest bg-gradient-to-r from-violet-500 to-indigo-500 text-white px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.4)]">AI</span>
                            </h2>
                            <p className="text-slate-400 text-base font-medium leading-relaxed px-4">
                                Yapıştır (<span className="text-white bg-white/10 px-2 py-0.5 rounded-lg font-mono text-sm">CTRL+V</span>) veya Dosya Seç.
                            </p>
                        </div>

                        <div className="border border-white/5 bg-zinc-950/60 backdrop-blur-md rounded-[40px] p-8 flex flex-col items-center gap-6 group hover:border-violet-500/30 transition-all duration-300 relative">
                            <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-600/10 to-indigo-600/10 rounded-[40px] pointer-events-none -z-10 group-hover:from-violet-600/20 group-hover:to-indigo-600/20 transition-all duration-300"></div>

                            <label className="cursor-pointer flex flex-col items-center gap-4 p-8 bg-black/85 rounded-[32px] border border-white/5 hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all duration-300 w-full max-w-[220px]">
                                <div className="w-16 h-16 bg-gradient-to-tr from-violet-500/10 to-indigo-500/10 text-violet-400 rounded-2xl flex items-center justify-center group-hover:from-violet-500 group-hover:to-indigo-500 group-hover:text-white transition-all duration-500 shadow-inner animate-pulse">
                                    <ImageIcon size={32} />
                                </div>
                                <span className="text-xs font-black uppercase tracking-widest text-slate-300 group-hover:text-white transition-colors">Dosya Seç</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*,application/pdf"
                                    onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                                />
                            </label>
                            
                            <div className="flex items-start gap-3 text-slate-400 bg-black/60 p-5 rounded-[24px] border border-white/5 w-full">
                                <Keyboard size={18} className="text-violet-400 shrink-0 mt-0.5 animate-pulse" />
                                <span className="text-xs font-bold leading-relaxed text-slate-300">
                                    İster dosya olarak yükle , istersen metinleri yada bir resmi kopyala yapıştır.(CTRL+V)
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className={`flex flex-col items-center transition-opacity ${isLoading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                        <div className="w-full aspect-video bg-black rounded-[32px] border border-white/10 overflow-hidden mb-8 relative flex items-center justify-center">
                            {pastedText ? (
                                <div className="p-6 w-full h-full overflow-y-auto bg-zinc-900/50">
                                    <p className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                                        {pastedText}
                                    </p>
                                </div>
                            ) : selectedFile?.type === 'application/pdf' ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="text-6xl text-red-500">📄</div>
                                    <span className="text-slate-400 font-bold text-sm">{selectedFile.name}</span>
                                </div>
                            ) : (
                                <img src={previewUrl!} className="w-full h-full object-contain" alt="Preview" />
                            )}
                        </div>

                        <div className="flex flex-col gap-4 w-full">
                            <button
                                onClick={startAnalysis}
                                disabled={isLoading}
                                className="w-full py-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-900/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <Sparkles size={22} className="animate-pulse" />
                                Yapay Zeka ile Analiz Et
                            </button>

                            <button
                                onClick={resetSelection}
                                disabled={isLoading}
                                className="w-full py-4 bg-zinc-900 text-slate-400 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                            >
                                <RotateCcw size={18} />
                                Resmi Değiştir
                            </button>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 bg-black/95 rounded-[48px] flex flex-col items-center justify-center z-50 backdrop-blur-md animate-fadeIn">
                        <PulseLoader />
                        <p className="font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400 text-2xl tracking-tight mt-10 animate-pulse">Yapay Zeka Okuyor</p>
                        <div className="flex items-center gap-3 mt-4 text-slate-400 h-6">
                            {currentStatus.icon}
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300">{currentStatus.text}</p>
                        </div>

                        <p className="mt-8 text-slate-500 text-xs font-bold text-center px-12 leading-relaxed mb-10">
                            Bu işlem internet hızınıza ve görselin karmaşıklığına göre biraz zaman alabilir.
                        </p>

                        <button
                            onClick={onCancelLoading}
                            className="flex items-center gap-2 px-8 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95"
                        >
                            <AlertTriangle size={14} />
                            İşlemi İptal Et
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadModal;
