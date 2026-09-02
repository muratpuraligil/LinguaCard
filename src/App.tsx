import React, { useState, useEffect, useRef } from 'react';
import { AppMode, Word, OcrStatus, FlashcardStudyMode, LibraryLevel } from './types';
import { wordService, supabase } from './services/supabaseClient';
import { analyzeImage, analyzeText } from './services/analyzeImage';
import { getLocalDateString } from './utils/stringUtils';
import { compressImage } from './utils/imageCompressor';
import { demoWords } from './services/demoData';
import FlashcardMode from './components/FlashcardMode';
import QuizMode from './components/QuizMode';
import SentenceMode from './components/SentenceMode';
import Dashboard from './components/Dashboard';
import CustomSetManager from './components/CustomSetManager';
import CustomSetStudyMode from './components/CustomSetStudyMode';
import SentenceModeSelectionModal from './components/SentenceModeSelectionModal';
import FlashcardModeSelectionModal from './components/FlashcardModeSelectionModal';
import UploadModal from './components/UploadModal';
import ArchiveView from './components/ArchiveView';
import Auth from './components/Auth';
import DeleteModal from './components/DeleteModal';
import { PulseLoader } from './components/Loader';
import LibraryScreen from './components/LibraryScreen';
import LibraryPracticeScreen from './components/LibraryPracticeScreen';
import { libraryData } from './data/libraryData';
import { LibrarySet } from './types';
import { CheckCircle2, X } from 'lucide-react';
import { APP_VERSION } from './version';

// Supabase hash'i temizlemeden önce kurtarma modunu hemen yakala
import a1WordsData from './data/json/a1_words.json';

const initialHash = window.location.hash;
const initialSearch = window.location.search;
const hasRecovery = initialHash.includes('type=recovery') || 
                      initialHash.includes('access_token') || 
                      new URLSearchParams(initialSearch).get('type') === 'recovery';

if (hasRecovery) {
  sessionStorage.setItem('lingua_recovery_pending', 'true');
}

const urlParams = new URLSearchParams(initialSearch || initialHash.replace('#', '?'));
const authError = urlParams.get('error_description') || urlParams.get('error');
if (authError) {
  sessionStorage.setItem('lingua_auth_error', authError);
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'warning';
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
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
  const [showFlashcardSelection, setShowFlashcardSelection] = useState(false);
  const [flashcardStudyMode, setFlashcardStudyMode] = useState<FlashcardStudyMode>('USER_WORDS');
  const [selectedLibraryLevel, setSelectedLibraryLevel] = useState<LibraryLevel>('A1');
  const [libraryWords, setLibraryWords] = useState<Word[]>(() => a1WordsData as Word[]);
  const [activeCustomSet, setActiveCustomSet] = useState<Word[]>([]);
  const [pendingSetName, setPendingSetName] = useState<string | null>(null);
  const [hasTourBeenShown, setHasTourBeenShown] = useState(false);
  const [activeLibrarySet, setActiveLibrarySet] = useState<LibrarySet | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => {
    return sessionStorage.getItem('lingua_recovery_pending') === 'true';
  });

  const LIBRARY_DATA_VERSION = 'v3';

  useEffect(() => {
    const savedSet = localStorage.getItem('lingua_active_random_mix');
    if (savedSet) {
      try {
        const parsed = JSON.parse(savedSet);
        if (parsed.version !== LIBRARY_DATA_VERSION) {
          localStorage.removeItem('lingua_active_random_mix');
          return;
        }
        if (!activeLibrarySet) {
          setActiveLibrarySet(parsed);
        }
      } catch (e) {
        console.error("Failed to recover active library set", e);
      }
    }
  }, []);

  const loadLibraryWords = async (level: LibraryLevel = selectedLibraryLevel) => {
    try {
      const fetched = await wordService.getLibraryWords(level);
      setLibraryWords(fetched);
    } catch (e) {
      console.error("Error loading library words:", e);
    }
  };

  useEffect(() => {
    if (mode === AppMode.FLASHCARDS && flashcardStudyMode === 'LIBRARY') {
      loadLibraryWords(selectedLibraryLevel);
    }
  }, [selectedLibraryLevel, flashcardStudyMode, mode]);

  useEffect(() => {
    const fetchSessionAndWords = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        if (currentSession?.user) {
          const userWords = await wordService.getAllWords(currentSession.user.id);
          setWords(userWords || []);
        }
      } catch (e) {
        console.error("Session/Words initialization error:", e);
      } finally {
        setLoadingSession(false);
      }
    };

    fetchSessionAndWords();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const userWords = await wordService.getAllWords(session.user.id);
        setWords(userWords || []);
      } else {
        setWords([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Track offset for sequential study (Flashcards/Quiz/Sentences)
  const [studyOffset, setStudyOffset] = useState(() => parseInt(localStorage.getItem('lingua_global_offset') || '0'));

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('IDLE');
  const [toast, setToast] = useState<Toast | null>(null);
  const [wordToDelete, setWordToDelete] = useState<string | null>(null);
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4500);
  };

  const handleRandomLibrarySet = (forceNew: boolean = false) => {
    if (!forceNew) {
      const savedSet = localStorage.getItem('lingua_active_random_mix');
      if (savedSet) {
        try {
          const parsed = JSON.parse(savedSet);
          if (parsed && parsed.version === LIBRARY_DATA_VERSION) {
            // Re-sync with libraryData to ensure all sentence text/translation updates are active
            const syncedSentences = parsed.sentences.map((s: any) => {
              if (s.sourceSetId) {
                for (const cat of libraryData) {
                  for (const set of cat.sets) {
                    if (set.id === s.sourceSetId) {
                      const baseId = s.id ? s.id.split('-')[2] || s.id : s.id;
                      const found = set.sentences.find(orig => orig.id === baseId || orig.id === s.id);
                      if (found) {
                        return { ...s, turkish: found.turkish, english: found.english };
                      }
                    }
                  }
                }
              }
              return s;
            });
            parsed.sentences = syncedSentences;
            setActiveLibrarySet(parsed);
            setMode(AppMode.LIBRARY_PRACTICE);
            return;
          } else {
            localStorage.removeItem('lingua_active_random_mix');
          }
        } catch (e) {
          console.error("Failed to parse saved random mix", e);
        }
      }
    }

    const allSentences: any[] = [];
    libraryData.forEach(cat => {
      cat.sets.forEach(set => {
        set.sentences.forEach(s => {
          allSentences.push({
            ...s,
            sourceSetTitle: set.title,
            sourceSetId: set.id
          });
        });
      });
    });

    const shuffled = [...allSentences].sort(() => Math.random() - 0.5);
    
    const selectedSentences = shuffled.slice(0, 34).map((s, idx) => ({
      ...s,
      id: `rand-${s.sourceSetId}-${s.id}-${idx}`
    }));

    const randomSet: LibrarySet & { version?: string } = {
      id: 'random-mix',
      title: `Karma Çalışma (${selectedSentences.length} Cümle)`,
      sentences: selectedSentences,
      version: LIBRARY_DATA_VERSION
    };

    localStorage.setItem('lingua_active_random_mix', JSON.stringify(randomSet));
    setActiveLibrarySet(randomSet);
    setMode(AppMode.LIBRARY_PRACTICE);
  };

  const handleAnalysis = async (fileOrText: File | string) => {
    setOcrLoading(true);
    setOcrStatus('PREPARING');

    abortControllerRef.current = new AbortController();

    try {
      let resultWords: any[] = [];
      if (typeof fileOrText === 'string') {
        setOcrStatus('ANALYZING');
        const res = await analyzeText(fileOrText, session, abortControllerRef.current.signal);
        if (res) resultWords = Array.isArray(res) ? res : [res];
      } else {
        setOcrStatus('PREPARING');
        const base64Image = await compressImage(fileOrText);
        setOcrStatus('ANALYZING');
        const res = await analyzeImage(base64Image, session, abortControllerRef.current.signal);
        if (res) resultWords = Array.isArray(res) ? res : [res];
      }

      if (resultWords && resultWords.length > 0) {
        const addedWords = await wordService.addWordsBulk(resultWords, session?.user?.id);
        setShowUploadModal(false);
        setPendingSetName(null);

        if (addedWords.length > 0) {
          setWords(prev => [...addedWords, ...prev]);
          showToast(`${addedWords.length} kelime başarıyla eklendi!`);
          // Clear active set and index cache so newest words populate the 20-card set immediately from start
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('lingua_flashcard_active_ids_') || key.startsWith('lingua_flashcard_current_index_') || key.startsWith('lingua_flashcard_set_num_')) {
              localStorage.removeItem(key);
            }
          });
        } else {
          showToast("Kelimeler zaten listenizde bulunuyor.", "warning");
        }

        if (flashcardStudyMode === 'AI_ADD' || mode === AppMode.FLASHCARDS) {
          setMode(AppMode.FLASHCARDS);
        }
      } else {
        showToast("Görselden kelime çıkarılamadı.", "warning");
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Analiz Hatası:", err);
        showToast(err.message || "Analiz sırasında bir hata oluştu.", "error");
      }
    } finally {
      setOcrLoading(false);
      setOcrStatus('IDLE');
    }
  };

  if (loadingSession) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <PulseLoader />
      <p className="text-slate-500 font-bold mt-8 animate-pulse text-[10px] uppercase tracking-[0.4em]">Sistem Hazırlanıyor...</p>
    </div>
  );

  if (!session || isRecoveryMode) return <Auth mode={isRecoveryMode ? 'reset' : undefined} onRecoveryComplete={() => { sessionStorage.removeItem('lingua_recovery_pending'); setIsRecoveryMode(false); }} />;

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
    return sortedActive.slice(safeOffset, safeOffset + 34);
  };

  const handleNextSet = () => {
    const sortedActive = words
      .filter(w => !w.is_archived && (!w.set_name || w.set_name === "Demo Kelimeler"))
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

    let newOffset = studyOffset + 34;
    if (newOffset >= sortedActive.length) {
      newOffset = 0;
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
      showToast("Demo verileri temizlendi!", "success");
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
    <div className="bg-black min-h-screen flex flex-col text-white font-['Plus_Jakarta_Sans']">
      {hasAnyDemoWords && mode === AppMode.HOME && (
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-blue-500/20 px-4 py-3 flex items-center justify-between z-50 relative shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 text-lg">✨</span>
            <p className="text-sm text-blue-200 font-medium hidden sm:block">Demo Paketini İncelemektesiniz.</p>
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

        {mode === AppMode.FLASHCARDS && (
          <FlashcardMode
            words={flashcardStudyMode === 'LIBRARY' ? libraryWords : words}
            studyMode={flashcardStudyMode}
            selectedLevel={selectedLibraryLevel}
            onLevelChange={(lvl) => {
              setSelectedLibraryLevel(lvl);
              loadLibraryWords(lvl);
            }}
            onOpenModeSelection={() => setShowFlashcardSelection(true)}
            onExit={() => setMode(AppMode.HOME)}
            onNextSet={handleNextSet}
            onRemoveWord={handleArchiveWord}
            onGoToQuiz={() => setMode(AppMode.QUIZ)}
            onGoToSentences={() => { setShowSentenceSelection(true); setMode(AppMode.HOME); }}
            userId={session?.user?.id}
          />
        )}
        {mode === AppMode.QUIZ && <QuizMode words={words.filter(w => !w.is_archived && (!w.set_name || w.set_name === "Demo Kelimeler"))} allWords={words} onExit={() => setMode(AppMode.HOME)} onGoToFlashcards={() => { setShowFlashcardSelection(true); setMode(AppMode.HOME); }} onGoToSentences={() => { setShowSentenceSelection(true); setMode(AppMode.HOME); }} />}
        {mode === AppMode.SENTENCES && <SentenceMode words={getSequentialSet()} onExit={() => setMode(AppMode.HOME)} onGoToFlashcards={() => { setShowFlashcardSelection(true); setMode(AppMode.HOME); }} onGoToQuiz={() => setMode(AppMode.QUIZ)} onRestartSentences={() => setShowSentenceSelection(true)} onRegenerate={handleNextSet} />}
        {mode === AppMode.ARCHIVE && <ArchiveView words={words.filter(w => w.is_archived)} onExit={() => setMode(AppMode.HOME)} onRestore={handleRestoreWord} onClearArchive={handleClearArchive} />}

        {mode === AppMode.LIBRARY && (
          <LibraryScreen 
            onExit={() => setMode(AppMode.HOME)} 
            onSelectSet={(set) => {
              setActiveLibrarySet(set);
              setMode(AppMode.LIBRARY_PRACTICE);
            }} 
            onRandomCreate={handleRandomLibrarySet}
          />
        )}

        {mode === AppMode.LIBRARY_PRACTICE && activeLibrarySet && (
          <LibraryPracticeScreen 
            set={activeLibrarySet} 
            onExit={() => setMode(AppMode.LIBRARY)} 
            onGoHome={() => { 
              window.location.href = window.location.origin + window.location.pathname; 
              window.location.reload(); 
            }}
            onGoToFlashcards={() => { setShowFlashcardSelection(true); setMode(AppMode.HOME); }}
            onGoToQuiz={() => setMode(AppMode.QUIZ)}
            onRegenerate={activeLibrarySet.id === 'random-mix' ? () => handleRandomLibrarySet(true) : undefined}
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
          onGoHome={() => { 
            window.location.href = window.location.origin + window.location.pathname; 
            window.location.reload(); 
          }}
          showToast={(msg, type) => setToast({ message: msg, type: type || 'success' })}
          onGoToFlashcards={() => { setShowFlashcardSelection(true); setMode(AppMode.HOME); }}
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
            } else if (m === AppMode.FLASHCARDS) {
              setShowFlashcardSelection(true);
            } else {
              setMode(m);
            }
          }}
          onAddWord={async (en, tr, ex, trex) => {
            let finalEx = ex;
            let finalTrex = trex;
            
            const isInvalid = (sentence: string, word: string) => {
              const cleanWord = word.trim().toLowerCase();
              const cleanSentence = (sentence || '').trim().toLowerCase();
              return !cleanSentence || cleanSentence === cleanWord || cleanSentence.length <= 3;
            };

            if (isInvalid(finalEx, en) || isInvalid(finalTrex, tr)) {
              try {
                const result = await analyzeText(en || tr, session);
                const item = Array.isArray(result) ? result[0] : result;
                if (item) {
                  finalEx = item.example_sentence || finalEx;
                  finalTrex = item.turkish_sentence || finalTrex;
                }
              } catch (err) {
                // AI cümle tamamlama hatası yakalanır
              }
            }

            const newWord = await wordService.addWord({ english: en, turkish: tr, example_sentence: finalEx, turkish_sentence: finalTrex }, session?.user?.id);
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
            setPendingSetName(null);
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

      {showFlashcardSelection && (
        <FlashcardModeSelectionModal
          onClose={() => setShowFlashcardSelection(false)}
          onSelectUserWords={() => {
            setFlashcardStudyMode('USER_WORDS');
            setShowFlashcardSelection(false);
            setMode(AppMode.FLASHCARDS);
          }}
          onSelectAiAdd={() => {
            setFlashcardStudyMode('AI_ADD');
            setShowFlashcardSelection(false);
            setShowUploadModal(true);
          }}
          onSelectLibrary={() => {
            setFlashcardStudyMode('LIBRARY');
            setSelectedLibraryLevel('A1');
            setShowFlashcardSelection(false);
            loadLibraryWords('A1');
            setMode(AppMode.FLASHCARDS);
          }}
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

        {dateToDelete && (() => {
          const toDeleteIds = words
            .filter(w => getLocalDateString(w.created_at) === dateToDelete)
            .map(w => w.id);
          return <DeleteModal
            title="Grubu Sil"
            description={`${dateToDelete} tarihindeki ${toDeleteIds.length} kelimeyi silmek istediğine emin misin?`}
            onConfirm={async () => {
              if (toDeleteIds.length === 0) {
                showToast("Silinecek kelime bulunamadı.", "warning");
                setDateToDelete(null);
                return;
              }
              const count = toDeleteIds.length;
              const ids = [...toDeleteIds];

              // Immediate state update and modal close for seamless UI feedback
              setWords(prev => prev.filter(w => !ids.includes(w.id)));
              setDateToDelete(null);

              try {
                await wordService.deleteWords(ids);
                showToast(`${count} kelime başarıyla silindi.`, "success");
              } catch (e: any) {
                console.warn("group delete background warning:", e);
                showToast(`${count} kelime silindi.`, "success");
              }
            }}
            onCancel={() => setDateToDelete(null)}
          />;
        })()}
      </div>
      
      {/* App Version Badge */}
      <div className="fixed bottom-3 right-4 z-[9999] opacity-60 text-xs font-black tracking-wider uppercase bg-black/80 px-4 py-2.5 rounded-full border border-white/10 pointer-events-none backdrop-blur-md">
         {APP_VERSION}
      </div>
    </div>
  );
}
