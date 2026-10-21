import React, { useState } from 'react';
import { Trophy, Frown, Handshake, MessageCircle, Copy, Check, RotateCcw, X, Zap } from 'lucide-react';
import { QuizChallengeData } from '../types';
import { generateChallengeUrl, createWhatsAppShareUrl, createChallengeResultMessage } from '../utils/challengeUtils';

interface QuizChallengeResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengeData: QuizChallengeData;
  recipientScore: number;
  onPlayAgain?: () => void;
}

const QuizChallengeResultModal: React.FC<QuizChallengeResultModalProps> = ({
  isOpen,
  onClose,
  challengeData,
  recipientScore,
  onPlayAgain
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const challengeUrl = generateChallengeUrl(challengeData);
  const { message, status } = createChallengeResultMessage(challengeData, recipientScore, challengeUrl);
  const whatsappUrl = createWhatsAppShareUrl(message);

  const isWon = status === 'won';
  const isLost = status === 'lost';
  const isDraw = status === 'draw';

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = message;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Kopyalama hatası:', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 font-['Plus_Jakarta_Sans'] animate-fadeIn">
      <div className={`bg-[#0c0c0c] w-full max-w-md rounded-[40px] p-6 sm:p-8 border shadow-2xl relative text-center overflow-hidden ${
        isWon ? 'border-emerald-500/30' : isLost ? 'border-red-500/30' : 'border-blue-500/30'
      }`}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-zinc-800 text-slate-400 hover:text-white rounded-full transition-all z-50 active:scale-90"
          title="Kapat"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Dynamic Badge / Icon */}
        <div className="mb-5 mt-2">
          {isWon && (
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.25)] animate-bounce">
              <Trophy size={40} />
            </div>
          )}
          {isLost && (
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
              <Frown size={40} />
            </div>
          )}
          {isDraw && (
            <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.25)]">
              <Handshake size={40} />
            </div>
          )}
        </div>

        {/* Result Titles */}
        <h3 className="text-3xl font-black text-white tracking-tight mb-1.5">
          {isWon ? 'Kazandın! 🏆' : isLost ? 'Kaybettin! 😢' : 'Berabere! 🤝'}
        </h3>
        <p className="text-slate-400 text-xs font-bold leading-relaxed mb-6">
          {isWon
            ? 'Tebrikler! Arkadaşının skorunu geçerek meydan okumayı kazandın.'
            : isLost
            ? 'Arkadaşının puanı bu sette daha yüksekti. Bir dahaki sefere daha iyisini yapabilirsin!'
            : 'Her iki taraf da aynı puanı aldı, harika bir denge!'}
        </p>

        {/* Score Comparison Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={`p-4 rounded-3xl border text-center ${
            isWon ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900 border-white/5'
          }`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Senin Puanın</span>
            <div className="flex items-center justify-center gap-1">
              <Zap size={16} className={isWon ? 'text-emerald-400 fill-emerald-400' : 'text-slate-400 fill-slate-400'} />
              <span className={`text-3xl font-black ${isWon ? 'text-emerald-400' : 'text-white'}`}>
                {recipientScore}
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-3xl border text-center ${
            isLost ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900 border-white/5'
          }`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              {challengeData.challengerName || 'Arkadaşın'}
            </span>
            <div className="flex items-center justify-center gap-1">
              <Zap size={16} className={isLost ? 'text-emerald-400 fill-emerald-400' : 'text-slate-400 fill-slate-400'} />
              <span className={`text-3xl font-black ${isLost ? 'text-emerald-400' : 'text-slate-300'}`}>
                {challengeData.challengerScore}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-[#25D366] hover:bg-[#20ba59] text-black font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[#25D366]/20 active:scale-95"
          >
            <MessageCircle size={20} fill="currentColor" />
            WhatsApp ile Sonucu Gönder
          </a>

          <button
            onClick={handleCopy}
            className={`w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all border active:scale-95 ${
              copied
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-slate-300'
            }`}
          >
            {copied ? (
              <>
                <Check size={16} className="text-emerald-400" />
                <span>Sonuç Metni Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy size={16} className="text-slate-400" />
                <span>Sonucu Metin Olarak Kopyala</span>
              </>
            )}
          </button>

          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RotateCcw size={15} /> Tekrar Oyna
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl font-bold text-xs transition-all"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizChallengeResultModal;
