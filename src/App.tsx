
import React, { useState, useEffect, useRef } from 'react';
import { AppMode, Word, OcrStatus } from './types';
import { wordService, supabase } from './services/supabaseClient';
import { analyzeImage, analyzeText } from './services/analyzeImage';
import { demoWords } from './services/demoData';
import FlashcardMode from './components/FlashcardMode';
import QuizMode from './components/QuizMode';
import SentenceMode from './components/SentenceMode';
import Dashboard from './components/Dashboard';
import CustomSetManager from './components/CustomSetManager';
import CustomSetStudyMode from './components/CustomSetStudyMode';
import SentenceModeSelectionModal from './components/SentenceModeSelectionModal';
import UploadModal from './components/UploadModal';
import ArchiveView from './components/ArchiveView';
import Auth from './components/Auth';
import DeleteModal from './components/DeleteModal';
import { PulseLoader } from './components/Loader';
import LibraryScreen from './components/LibraryScreen';
import LibraryPracticeScreen from './components/LibraryPracticeScreen';
import { LibrarySet } from './types';
import { CheckCircle2, X } from 'lucide-react';
import { APP_VERSION } from './version';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning';
}

const WORKER_CODE = `
  self.onmessage = async (e) => {
    const { file } = e.data;
    try {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;
      // Text clarity is crucial for OCR, so we use a higher resolution limit.
      const MAX_DIMENSION = 1600; 
      
      if (width > height) {
        if (width > MAX_DIMENSION) {
          height = Math.round(height * (MAX_DIMENSION / width));
          width = MAX_DIMENSION;
        }
      } else {
        if (height > MAX_DIMENSION) {
          width = Math.round(width * (MAX_DIMENSION / height));
          height = MAX_DIMENSION;
        }
      }

      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context error");
      ctx.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
      self.postMessage({ success: true, blob: blob });
    } catch (error) {
      self.postMessage({ success: false, error: error.message });
    }
  };
`;

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // Prefix'i (data:image/...;base64,) kesmiyoruz, tam URL'i döndürüyoruz
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [words, setWords] = useState<Word[]>([]);
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSentenceSelection, setShowSentenceSelection] = useState(false);
  const [activeCustomSet, setActiveCustomSet] = useState<Word[]>([]);
  const [pendingSetName, setPendingSetName] = useState<string | null>(null);
  const [hasTourBeenShown, setHasTourBeenShown] = useState(false);
  const [activeLibrarySet, setActiveLibrarySet] = useState<LibrarySet | null>(null);

  // Track offset for sequential study (Flashcards/Quiz/Sentences)
  const [studyOffset, setStudyOffset] = useState(() => parseInt(localStorage.getItem('lingua_global_offset') || '0'));

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('IDLE');
  const [toast, setToast] = useState<Toast | null>(null);
  const [wordToDelete, setWordToDelete] = useState<string | null>(null);
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadWordsWithDemoFallback = async (userId: string) => {
    let allWords = await wordService.getAllWords(userId);
    const demoFlagKey = 'demoDataLoaded_' + userId;
    if ((!allWords || allWords.length === 0) && !localStorage.getItem(demoFlagKey)) {
      localStorage.setItem(demoFlagKey, 'true');
      try {
        const addedDemoWords = await wordService.addWordsBulk(demoWords, userId);
        if (addedDemoWords && addedDemoWords.length > 0) {
          allWords = addedDemoWords;
        }
      } catch (e) {
        console.error("Failed to load demo words", e);
      }
    }
    return allWords || [];
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (!supabase) {
          if (isMounted) setLoadingSession(false);
          return;
        }

        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (isMounted) {
          if (currentSession) {
            setSession(currentSession);
            const wordsLoaded = await loadWordsWithDemoFallback(currentSession.user.id);
            setWords(wordsLoaded);
          }
        }
      } catch (err) {
        console.error("Başlatma hatası:", err);
      } finally {
        if (isMounted) setLoadingSession(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && newSession) {
        setSession(newSession);
        loadWordsWithDemoFallback(newSession.user.id).then(w => setWords(w));
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setWords([]);
        wordService.clearCache();
        setHasTourBeenShown(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAnalysis = async (input: File | string) => {
    if (ocrLoading) return;

    setOcrLoading(true);
    setOcrStatus('PREPARING');
    abortControllerRef.current = new AbortController();

    if (typeof input === 'string') {
      try {
        setOcrStatus('CONNECTING');
        setOcrStatus('ANALYZING');
        const extracted = await analyzeText(
          input,
          session,
          abortControllerRef.current?.signal
        );
        // analyzeText returns a single word or array, normalize to array
        const extractedArray = Array.isArray(extracted) ? extracted : [extracted];
        handleExtractedWords(extractedArray);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          showToast(err.message || "Metin analiz hatası.", "error");
        }
      } finally {
        setOcrLoading(false);
        setOcrStatus('IDLE');
        abortControllerRef.current = null;
      }
      return;
    }

    const file = input;
    // PDF files cannot be processed by createImageBitmap in the worker.
    // We send them directly as Base64 to the analyzeImage service.
    if (file.type === 'application/pdf') {
      try {
        setOcrStatus('CONNECTING');
        const base64Data = await blobToBase64(file);
        
        setOcrStatus('ANALYZING');
        const analysisMode = pendingSetName ? 'document' : 'general';

        const extracted = await analyzeImage(
          base64Data,
          session,
          abortControllerRef.current?.signal,
          analysisMode
        );

        handleExtractedWords(extracted);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          showToast(err.message || "PDF analiz hatası.", "error");
        }
      } finally {
        setOcrLoading(false);
        setOcrStatus('IDLE');
        abortControllerRef.current = null;
      }
      return;
    }

    // Image processing for standard formats (JPEG, PNG, etc.)
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);
    workerRef.current = worker;

    worker.onmessage = async (e) => {
      const { success, blob: resizedBlob, error: workerError } = e.data;

      if (success) {
        try {
          setOcrStatus('CONNECTING');
          const base64FullData = await blobToBase64(resizedBlob);

          setOcrStatus('ANALYZING');
          const analysisMode = pendingSetName ? 'document' : 'general';

          const extracted = await analyzeImage(
            base64FullData,
            session,
            abortControllerRef.current?.signal,
            analysisMode
          );

          handleExtractedWords(extracted);
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            const errorMsg = err.message || "Analiz hatası.";
            showToast(errorMsg, "error");
          }
        } finally {
          setOcrLoading(false);
          setOcrStatus('IDLE');
          abortControllerRef.current = null;
        }
      } else {
        showToast(workerError || "Görsel hazırlama hatası.", "error");
        setOcrLoading(false);
        setOcrStatus('IDLE');
      }

      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      workerRef.current = null;
    };

    worker.postMessage({ file });
  };

  // Helper to handle the results of AI extraction
  const handleExtractedWords = async (extracted: any[]) => {
    if (extracted && extracted.length > 0) {
      const wordsToAdd = pendingSetName
        ? extracted.map((w: any) => ({ ...w, set_name: pendingSetName }))
        : extracted;

      const addedWords = await wordService.addWordsBulk(wordsToAdd, session?.user?.id);

      if (addedWords.length > 0) {
        setWords(prev => [...addedWords, ...prev]);
        showToast(`${addedWords.length} kelime eklendi!`);
        setShowUploadModal(false);
        setPendingSetName(null);
      } else {
        showToast("Analiz edilen kelimeler zaten listenizde.", "warning");
      }
    } else {
      showToast("Görselde içerik bulunamadı.", "warning");
    }
  };

  if (loadingSession) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <PulseLoader />
      <p className="text-slate-500 font-bold mt-8 animate-pulse text-[10px] uppercase tracking-[0.4em]">Sistem Hazırlanıyor...</p>
    </div>
  );

  if (!session) return <Auth />;

  const displayWords = words
    .filter(w => !w.is_archived && (!w.set_name || w.set_name === "Demo Kelimeler"))
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const getSequentialSet = () => {
    const sortedActive = words
      .filter(w => !w.is_archived && (!w.set_name || w.set_name === "Demo Kelimeler"))
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

    const safeOffset = studyOffset >= sortedActive.length ? 0 : studyOffset;
    if (studyOffset !== safeOffset) {
      setTimeout(() => {
        setStudyOffset(0);
        localStorage.setItem('lingua_global_offset', '0');
      }, 0);
    }
    return sortedActive.slice(safeOffset, safeOffset + 20);
  };

  const handleNextSet = () => {
    const sortedActive = words
      .filter(w => !w.is_archived && (!w.set_name || w.set_name === "Demo Kelimeler"))
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

    let newOffset = studyOffset + 20;
    if (newOffset >= sortedActive.length) {
      newOffset = 0; // Loop back to start
      showToast("Tüm kelimeler bitti, başa dönüldü!", "success");
    }

    setStudyOffset(newOffset);
    localStorage.setItem('lingua_global_offset', newOffset.toString());
  };

  const handleArchiveWord = async (id: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, is_archived: true } : w));
    await wordService.toggleArchive(id, true);
  };

  const handleRestoreWord = async (id: string) => {
    setWords(prev => prev.map(w => w.id === id ? { ...w, is_archived: false } : w));
    await wordService.toggleArchive(id, false);
  };

  const handleClearArchive = async () => {
    const archivedIds = words.filter(w => w.is_archived).map(w => w.id);
    if (archivedIds.length === 0) return;

    await wordService.deleteWords(archivedIds);
    setWords(prev => prev.filter(w => !w.is_archived));
    showToast("Arşiv temizlendi.", "success");
  };

  const handleClearDemoData = async () => {
    const demoIds = words.filter(w => w.set_name === "Demo Kelimeler").map(w => w.id);
    if(demoIds.length > 0) {
      await wordService.deleteWords(demoIds);
      setWords(prev => prev.filter(w => w.set_name !== "Demo Kelimeler"));
      showToast("Demo verileri temizlendi! Artık kendi kelimelerinizi ekleyebilirsiniz.", "success");
    }
  };

  const handleLoadDemo = async () => {
    if (!session) return;
    try {
      showToast("Demo veriler yükleniyor...", "success");
      const addedDemoWords = await wordService.addWordsBulk(demoWords, session.user.id);
      if (addedDemoWords && addedDemoWords.length > 0) {
        setWords(prev => [...addedDemoWords, ...prev]);
        showToast("15 adet demo kelime başarıyla eklendi!", "success");
        localStorage.setItem('demoDataLoaded_' + session.user.id, 'true');
        // Clear any previous progress for the demo set to ensure it starts at 0
        localStorage.removeItem('lingua_set_progress_Demo_Kelimeler');
      } else {
        showToast("Zaten demo kelimeleriniz var veya eklenemedi.", "warning");
      }
    } catch (e) {
      console.error(e);
      showToast("Demo verileri yüklenirken hata oluştu.", "error");
    }
  };

  const hasAnyDemoWords = words.some(w => w.set_name === "Demo Kelimeler");

  return (
    <div className="bg-black min-h-screen flex flex-col text-white font['Plus_Jakarta_Sans']">
      {hasAnyDemoWords && mode === AppMode.HOME && (
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-blue-500/20 px-4 py-3 flex items-center justify-between z-50 relative shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-lg">✨</span>
            <p className="text-sm text-blue-200 font-medium hidden sm:block">Demo Paketini İncelemektesiniz. Uygulamayı denemek için örnek kelimeler kullanılıyor.</p>
            <p className="text-sm text-blue-200 font-medium sm:hidden">Demo Paketini İncelemektesiniz.</p>
          </div>
          <button 
            onClick={handleClearDemoData}
            className="text-xs font-bold px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 rounded-lg transition-colors border border-blue-500/30 whitespace-nowrap"
          >
            Demo'yu Kapat
          </button>
        </div>
      )}
      
      <div className="flex-1 relative flex flex-col">
        {toast && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10001] animate-fadeIn w-full max-w-lg px-4">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-3xl border shadow-2xl backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              toast.type === 'warning' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              <CheckCircle2 size={24} />
              <span className="font-black text-sm flex-1">{toast.message}</span>
              <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-white/10"><X size={16} /></button>
            </div>
          </div>
        )}

        {mode === AppMode.FLASHCARDS && <FlashcardMode words={words.filter(w => !w.is_archived && (!w.set_name || w.set_name === "Demo Kelimeler"))} onExit={() => setMode(AppMode.HOME)} onNextSet={handleNextSet} onRemoveWord={handleArchiveWord} onGoToQuiz={() => { setMode(AppMode.QUIZ); }} onGoToSentences={() => { setShowSentenceSelection(true); setMode(AppMode.HOME); }} />}
        {mode === AppMode.QUIZ && <QuizMode words={words.filter(w => !w.is_archived && (!w.set_name || w.set_name === "Demo Kelimeler"))} allWords={words} onExit={() => setMode(AppMode.HOME)} onGoToFlashcards={() => setMode(AppMode.FLASHCARDS)} onGoToSentences={() => { setShowSentenceSelection(true); setMode(AppMode.HOME); }} />}
        {mode === AppMode.SENTENCES && <SentenceMode words={getSequentialSet()} onExit={() => setMode(AppMode.HOME)} onGoToFlashcards={() => setMode(AppMode.FLASHCARDS)} onGoToQuiz={() => setMode(AppMode.QUIZ)} onRestartSentences={() => setShowSentenceSelection(true)} />}
        {mode === AppMode.ARCHIVE && <ArchiveView words={words.filter(w => w.is_archived)} onExit={() => setMode(AppMode.HOME)} onRestore={handleRestoreWord} onClearArchive={handleClearArchive} />}

        {mode === AppMode.LIBRARY && (
          <LibraryScreen 
            onExit={() => setMode(AppMode.HOME)} 
            onSelectSet={(set) => {
              setActiveLibrarySet(set);
              setMode(AppMode.LIBRARY_PRACTICE);
            }} 
          />
        )}

        {mode === AppMode.LIBRARY_PRACTICE && activeLibrarySet && (
          <LibraryPracticeScreen 
            set={activeLibrarySet} 
            onExit={() => setMode(AppMode.LIBRARY)} 
            onGoHome={() => setMode(AppMode.HOME)}
            onGoToFlashcards={() => setMode(AppMode.FLASHCARDS)}
            onGoToQuiz={() => setMode(AppMode.QUIZ)}
          />
        )}

        {mode === AppMode.CUSTOM_SETS && (
        <CustomSetManager
          words={words}
          onExit={() => setMode(AppMode.HOME)}
          onPlaySet={(setWords) => {
            setActiveCustomSet(setWords);
            setMode(AppMode.CUSTOM_SET_STUDY);
          }}
          onUploadNewSet={(name) => {
            setPendingSetName(name);
            setShowUploadModal(true);
          }}
          onRefresh={async () => {
            if (session?.user?.id) {
              const w = await wordService.getAllWords(session.user.id);
              setWords(w || []);
            }
          }}
          onRenameCustomSetLocally={(oldName, newName) => {
            setWords(prev => prev.map(w => w.set_name === oldName ? { ...w, set_name: newName } : w));
          }}
        />
      )}

      {mode === AppMode.CUSTOM_SET_STUDY && (
        <CustomSetStudyMode
          words={activeCustomSet}
          onExit={() => setMode(AppMode.CUSTOM_SETS)}
          onGoHome={() => setMode(AppMode.HOME)}
          showToast={(msg, type) => setToast({ message: msg, type: type || 'success' })}
          onGoToFlashcards={() => setMode(AppMode.FLASHCARDS)}
          onGoToQuiz={() => setMode(AppMode.QUIZ)}
        />
      )}

      {mode === AppMode.HOME && (
        <Dashboard
          userEmail={session.user.email}
          words={displayWords}
          onModeSelect={(m) => {
            if (m === AppMode.SENTENCES) {
              setShowSentenceSelection(true);
            } else {
              setMode(m);
            }
          }}
          onAddWord={async (en, tr, ex, trex) => {
            const newWord = await wordService.addWord({ english: en, turkish: tr, example_sentence: ex, turkish_sentence: trex }, session.user.id);
            if (newWord) {
              setWords(prev => [newWord, ...prev]);
              return true;
            }
            return false;
          }}
          onDeleteWord={(id) => setWordToDelete(id)}
          onDeleteByDate={(date) => setDateToDelete(date)}
          onLogout={() => supabase.auth.signOut()}
          onOpenUpload={() => {
            setPendingSetName(null); // Normal upload için null yap
            setShowUploadModal(true);
          }}
          onQuickAdd={() => {
            const btn = document.getElementById('force-open-add-word');
            if (btn) btn.click();
          }}
          onResetAccount={() => { }}
          onArchiveWord={handleArchiveWord}
          onLoadDemo={handleLoadDemo}
          onClearDemo={handleClearDemoData}
          isDemoActive={hasAnyDemoWords}
          showTour={!hasTourBeenShown}
          onTourComplete={() => setHasTourBeenShown(true)}
        />
      )}

      {showSentenceSelection && (
        <SentenceModeSelectionModal
          onClose={() => setShowSentenceSelection(false)}
          onSelectStandard={() => {
            setShowSentenceSelection(false);
            setMode(AppMode.SENTENCES);
          }}
          onSelectCustom={() => {
            setShowSentenceSelection(false);
            setMode(AppMode.CUSTOM_SETS);
          }}
          onSelectLibrary={() => {
            setShowSentenceSelection(false);
            setMode(AppMode.LIBRARY);
          }}
        />
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onFileSelect={handleAnalysis}
          isLoading={ocrLoading}
          ocrStatus={ocrStatus}
          onCancelLoading={() => {
            abortControllerRef.current?.abort();
            setOcrLoading(false);
          }}
          showToast={showToast}
        />
      )}

      {wordToDelete && <DeleteModal onConfirm={async () => {
        await wordService.deleteWord(wordToDelete);
        setWords(prev => prev.filter(w => w.id !== wordToDelete));
        setWordToDelete(null);
      }} onCancel={() => setWordToDelete(null)} />}

        {dateToDelete && <DeleteModal title="Grubu Sil" description={`${dateToDelete} tarihindeki kelimeleri silmek istediğine emin misin?`} onConfirm={async () => {
          const toDelete = words.filter(w => new Date(w.created_at!).toLocaleDateString('tr-TR') === dateToDelete).map(w => w.id);
          await wordService.deleteWords(toDelete);
          setWords(prev => prev.filter(w => !toDelete.includes(w.id)));
          setDateToDelete(null);
          showToast(`${toDelete.length} kelime silindi.`, "success");
        }} onCancel={() => setDateToDelete(null)} />}
      </div>
      
      {/* App Version Badge */}
      <div className="fixed bottom-3 right-4 z-[9999] opacity-40 text-[9px] font-black tracking-widest uppercase bg-black/60 px-3 py-1.5 rounded-full border border-white/10 pointer-events-none backdrop-blur-md">
         {APP_VERSION}
      </div>
    </div>
  );
}
