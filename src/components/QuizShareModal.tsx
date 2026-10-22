import React, { useState } from 'react';
import { X, Share2, Copy, Check, MessageCircle, Swords, Zap } from 'lucide-react';
import { QuizChallengeData } from '../types';
import { generateChallengeUrl, createWhatsAppShareUrl, createChallengeInviteMessage } from '../utils/challengeUtils';

interface QuizShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeData: QuizChallengeData;
}

const QuizShareModal: React.FC<QuizShareModalProps> = ({
  isOpen,
  onClose,
  challengeData
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const challengeUrl = generateChallengeUrl(challengeData);
  const inviteMessage = createChallengeInviteMessage(challengeData, challengeUrl);
  const whatsappUrl = createWhatsAppShareUrl(inviteMessage);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(challengeUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = challengeUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: Silent handling
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] animate-fadeIn">
      <div className="bg-[#0c0c0c] w-full max-w-md rounded-[36px] p-6 sm:p-7 border border-emerald-500/20 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-zinc-800 text-slate-400 hover:text-white rounded-full transition-all z-50 active:scale-90"
          title="Kapat"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="text-center mb-6 mt-1">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Swords size={28} />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">Meydan Oku & Paylaş</h3>
          <p className="text-slate-400 text-xs font-bold mt-1.5 leading-relaxed">
            Bu seti arkadaşlarınla paylaş, bakalım seni geçebilecekler mi?
          </p>
        </div>

        {/* Set & Score Details */}
        <div className="bg-zinc-900/80 border border-white/5 rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Seviye ve Set</span>
            <span className="text-base font-black text-white">{challengeData.level} · SET {challengeData.setNum}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-emerald-400 font-black text-sm">
            <Zap size={15} fill="currentColor" />
            {challengeData.challengerScore} PUAN
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-[#25D366] hover:bg-[#20ba59] text-black font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[#25D366]/20 active:scale-95"
          >
            <MessageCircle size={20} fill="currentColor" />
            WhatsApp ile Paylaş
          </a>

          <button
            onClick={handleCopy}
            className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all border active:scale-95 ${
              copied
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-white'
            }`}
          >
            {copied ? (
              <>
                <Check size={18} className="text-emerald-400" />
                <span>Link Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy size={18} className="text-slate-400" />
                <span>Yarışma Linkini Kopyala</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[10px] text-slate-500 text-center font-bold mt-4 leading-normal">
          Arkadaşların linke tıkladığında bu setteki aynı kelimelerle yarışacak ve kendi çalışmaları asla bozulmayacaktır.
        </p>
      </div>
    </div>
  );
};

export default QuizShareModal;
