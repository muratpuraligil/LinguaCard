
import React, { useState, useEffect } from 'react';
import { Word } from '../types';
import { Search, Volume2, Trash2, Plus, Sparkles, Image, Calendar, AlertCircle, Languages, X, Layers, MessageSquareQuote, Wand2, Eraser, Archive, Info, ArrowUp } from 'lucide-react';
import { analyzeText } from '../services/analyzeImage';
import { supabase } from '../services/supabaseClient';
import ArchiveModal from './ArchiveModal';

interface WordListProps {
  words: Word[];
  onDelete: (id: string) => void;
  onDeleteByDate: (date: string) => void;
  onAdd: (english: string, turkish: string, example: string, turkish_sentence: string) => Promise<boolean>;
  onOpenUpload: () => void;
  onArchive: (id: string) => void;
}

const WordList: React.FC<WordListProps> = ({ words, onDelete, onDeleteByDate, onAdd, onOpenUpload, onArchive }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [newEng, setNewEng] = useState('');
  const [newTr, setNewTr] = useState('');
  const [newEx, setNewEx] = useState('');
  const [newTrEx, setNewTrEx] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiFilling, setIsAiFilling] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  // Çevirisi açık olan cümlenin ID'si
  const [flippedSentenceId, setFlippedSentenceId] = useState<string | null>(null);

  const filteredWords = words.filter(w =>
    w.english.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.turkish.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedWords = searchTerm ? filteredWords : filteredWords.slice(0, visibleCount);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSentenceClick = (id: string) => {
    if (flippedSentenceId === id) {
      setFlippedSentenceId(null);
    } else {
      setFlippedSentenceId(id);
      // 3 saniye sonra otomatik kapat
      setTimeout(() => {
        setFlippedSentenceId(prev => prev === id ? null : prev);
      }, 3500);
    }
  };

  const handleForceOpen = () => {
    setIsAdding(true);
    setFormError(null);
    setTimeout(() => {
      const formElement = document.getElementById('add-word-form-container');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Mükerrer Kontrolü (Case-Insensitive)
    const exists = words.some(w => w.english.trim().toLowerCase() === newEng.trim().toLowerCase());
    if (exists) {
      setFormError('Bu kelime zaten listenizde mevcut!');
      return;
    }

    setIsSubmitting(true);
    const success = await onAdd(newEng, newTr, newEx, newTrEx);
    setIsSubmitting(false);
    if (success) {
      setNewEng(''); setNewTr(''); setNewEx(''); setNewTrEx('');
      setIsAdding(false);
    } else {
      setFormError('Bir hata oluştu, tekrar deneyin.');
    }
  };

  const handleAiFill = async () => {
    const input = newEng || newTr;
    if (!input || input.trim().length < 2) {
      setFormError('Lütfen en az bir kelime girin.');
      return;
    }

    setIsAiFilling(true);
    setFormError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await analyzeText(input, session);

      if (result) {
        setNewEng(result.english || newEng);
        setNewTr(result.turkish || newTr);
        setNewEx(result.example_sentence || '');
        setNewTrEx(result.turkish_sentence || '');
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'AI ile doldurma başarısız.');
    } finally {
      setIsAiFilling(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Tarih Yok';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  return (
    <div className="w-full" id="word-list-section">
      <button id="force-open-add-word" className="hidden" onClick={handleForceOpen}></button>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={20} />
          <input
            type="text"
            placeholder="Listende hızlıca ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-12 py-4 bg-zinc-900 border border-white/10 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:bg-zinc-800 transition-all text-base font-bold text-white placeholder:text-slate-600 h-full shadow-lg shadow-black/20"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
        <button
          onClick={() => { setIsAdding(!isAdding); setFormError(null); }}
          className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-base transition-all active:scale-95 whitespace-nowrap ${isAdding ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/20'}`}
        >
          <Plus size={20} className={isAdding ? "rotate-45 transition-transform" : "transition-transform"} />
          {isAdding ? 'İptal' : 'Hızlı Ekle'}
        </button>
      </div>

      {isAdding && (
        <div id="add-word-form-container">
          <form onSubmit={handleSubmit} className="mb-8 bg-zinc-900 p-8 rounded-[32px] border border-blue-500/20 animate-fadeIn shadow-2xl relative overflow-hidden">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xl font-black text-white">Yeni Kelime</h4>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Manuel Giriş</p>
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                <Info size={14} className="flex-shrink-0" />
                <p>TR yada EN kelimeni gir, diğer alanları AI tamamlasın.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <input required value={newEng} onChange={e => setNewEng(e.target.value)} placeholder="İngilizce Kelime" className="w-full p-4 rounded-xl bg-black border border-white/5 focus:border-blue-500 transition-all outline-none text-white font-bold text-sm disabled:opacity-50 placeholder:text-slate-600 placeholder:font-medium" disabled={isAiFilling} />
              </div>
              <div className="relative">
                <input required value={newTr} onChange={e => setNewTr(e.target.value)} placeholder="Türkçe Karşılığı" className="w-full p-4 rounded-xl bg-black border border-white/5 focus:border-blue-500 transition-all outline-none text-white font-bold text-sm disabled:opacity-50 placeholder:text-slate-600 placeholder:font-medium" disabled={isAiFilling} />
              </div>
            </div>

            {/* AI Action Button */}
            <div className="flex justify-start items-center mb-6">
              <button
                type="button"
                onClick={handleAiFill}
                disabled={isAiFilling || (!newEng && !newTr)}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-purple-500/10 px-4 py-2 rounded-lg border border-purple-500/20 hover:bg-purple-500/20"
              >
                <Wand2 size={14} className={isAiFilling ? "animate-spin" : ""} />
                {isAiFilling ? 'AI Analiz Ediyor...' : 'AI ile Tamamla'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <input value={newEx} onChange={e => setNewEx(e.target.value)} placeholder="İngilizce Cümle" className="w-full p-4 rounded-xl bg-black border border-white/5 focus:border-blue-500 transition-all outline-none text-white font-bold text-sm disabled:opacity-50 placeholder:text-slate-600 placeholder:font-medium" disabled={isAiFilling} />
              <input value={newTrEx} onChange={e => setNewTrEx(e.target.value)} placeholder="Türkçe Cümle" className="w-full p-4 rounded-xl bg-black border border-white/5 focus:border-blue-500 transition-all outline-none text-white font-bold text-sm disabled:opacity-50 placeholder:text-slate-600 placeholder:font-medium" disabled={isAiFilling} />
            </div>
            {formError && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 animate-shake"><AlertCircle size={20} /> <span className="font-bold text-sm">{formError}</span></div>}

            <div className="flex items-center gap-3">
              <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-sm shadow-xl shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50">
                {isSubmitting ? 'Kontrol Ediliyor...' : 'Listeye Kaydet'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewEng(''); setNewTr(''); setNewEx(''); setNewTrEx('');
                  setFormError(null);
                }}
                className="p-3 bg-zinc-800 hover:bg-zinc-700 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5 disabled:opacity-50"
                title="Temizle"
              >
                <Eraser size={20} />
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedWords.map((word) => {
          const dateStr = formatDate(word.created_at);
          const isFlipped = flippedSentenceId === word.id;

          // Eğer cümle kelimenin kendisiyse veya çok kısaysa bozuk sayıp göstermiyoruz
          const hasValidSentence = word.example_sentence &&
            word.example_sentence.trim().length > 3 &&
            word.example_sentence.trim().toLowerCase() !== word.english.trim().toLowerCase();

          return (
            <div key={word.id} className="bg-zinc-800 p-6 rounded-[32px] border-b-4 border-slate-700 hover:border-slate-500 transition-all group relative flex flex-col h-full items-start text-left shadow-lg">
              {word.set_name && (
                <div className="absolute top-0 right-0 bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase px-3 py-1.5 rounded-bl-xl border-l border-b border-blue-500/20 flex items-center gap-1.5 backdrop-blur-sm z-10">
                  <Layers size={10} /> {word.set_name}
                </div>
              )}

              <div className="flex justify-between items-start w-full mb-2 mt-1">
                <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors leading-tight">{word.english}</h3>
                <button onClick={() => speak(word.english)} className="text-slate-600 hover:text-blue-400 p-1.5 rounded-lg bg-white/5 transition-all flex-shrink-0 ml-2">
                  <Volume2 size={18} />
                </button>
              </div>
              <p className="text-slate-500 font-bold text-base mb-4">{word.turkish}</p>

              {hasValidSentence ? (
                <div
                  className="perspective-1000 w-full mb-4 cursor-pointer group/sentence"
                  onClick={() => handleSentenceClick(word.id)}
                >
                  <div className={`relative w-full transition-transform duration-700 transform-style-3d min-h-[90px] ${isFlipped ? 'rotate-y-180' : ''}`}>

                    {/* ÖN YÜZ (EN Cümle) */}
                    <div className="absolute inset-0 backface-hidden bg-black/40 border border-white/5 p-4 rounded-[24px] group-hover/sentence:bg-black/60 transition-colors flex items-center">
                      <p className="text-xs font-bold leading-relaxed text-blue-100 italic relative z-10">
                        "{word.example_sentence}"
                      </p>
                      <div className="absolute bottom-2 right-3 opacity-30 group-hover/sentence:opacity-100 transition-opacity">
                        <Languages size={12} className="text-slate-500" />
                      </div>
                    </div>

                    {/* ARKA YÜZ (TR Çeviri) */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 bg-blue-600 border border-blue-500 p-4 rounded-[24px] flex items-center shadow-lg shadow-blue-900/20">
                      <p className="text-[10px] font-black leading-relaxed text-white uppercase tracking-wider relative z-10">
                        {word.turkish_sentence || 'Çeviri eklenmemiş'}
                      </p>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="flex-1 mb-4 w-full"></div>
              )}

              <div className="w-full flex justify-between items-center mt-auto pt-1">
                <button 
                  onClick={() => onDeleteByDate(dateStr)} 
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all group/date"
                  title="bu tarihte yüklenenleri sil."
                >
                  <Calendar size={14} /> <span className="text-[10px] font-black tracking-widest">{dateStr}</span>
                </button>
                <div className="flex items-center gap-2">
                  {/* Archive Button with Tooltip */}
                  <div className="relative group/btn">
                    <button
                      onClick={() => setArchiveId(word.id)}
                      className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all active:scale-90"
                    >
                      <Archive size={16} />
                    </button>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/btn:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap border border-white/10 shadow-xl z-50">
                      Arşiv'e git
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-b border-r border-white/10 rotate-45"></div>
                    </div>
                  </div>

                  {/* Delete Button with Tooltip */}
                  <div className="relative group/btn">
                    <button
                      onClick={() => onDelete(word.id)}
                      className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/btn:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap border border-white/10 shadow-xl z-50">
                      Sil
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 border-b border-r border-white/10 rotate-45"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!searchTerm && visibleCount < filteredWords.length && (
        <div className="w-full flex justify-center mt-8">
          <button
            onClick={() => setVisibleCount(prev => prev + 20)}
            className="px-8 py-4 bg-zinc-900 border border-white/10 rounded-full text-slate-400 font-bold hover:bg-white/10 hover:text-white transition-all active:scale-95 shadow-lg"
          >
            Daha Fazla Göster ({filteredWords.length - visibleCount} kaldı)
          </button>
        </div>
      )}

      {archiveId && (
        <ArchiveModal
          onConfirm={() => {
            if (archiveId) {
              onArchive(archiveId);
              setArchiveId(null);
            }
          }}
          onCancel={() => setArchiveId(null)}
        />
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-10 left-6 md:left-[calc(50%-660px)] z-50 group flex flex-col items-center gap-2 p-3 bg-zinc-900/80 backdrop-blur-xl hover:bg-blue-600/10 border border-white/10 hover:border-blue-500/30 rounded-3xl transition-all duration-500 hover:scale-110 active:scale-95 shadow-2xl shadow-black/40"
          title="yukarıya dön"
        >
          <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center animate-bounce group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
            <ArrowUp size={20} />
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100 transition-opacity duration-300">yukarıya dön</span>
        </button>
      )}
    </div>
  );
};

export default WordList;
