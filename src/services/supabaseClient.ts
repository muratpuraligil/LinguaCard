import { createClient } from '@supabase/supabase-js';
import { Word, WordProgressStatus, UserWordProgress } from '../types';
import a1WordsData from '../data/json/a1_words.json';

const supabaseUrl = 'https://xxjfrsbcygpcksndjrzm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4amZyc2JjeWdwY2tzbmRqcnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTc1NDQsImV4cCI6MjA4MTgzMzU0NH0.j8sFVCH1A_hbrDOMEAUHPn5-0seRK6ZtxS2KQXxRaho';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

const LOCAL_STORAGE_KEY = 'lingua_words_local';
const LOCAL_PROGRESS_KEY = 'lingua_user_progress';

const getLocalWords = (): Word[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

const setLocalWords = (words: Word[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(words));
};

const mapDbToApp = (dbRecord: any): Word => ({
  id: dbRecord.id,
  english: dbRecord.word_en || dbRecord.english || '',
  turkish: dbRecord.word_tr || dbRecord.turkish || '',
  example_sentence: dbRecord.example_sentence_en || dbRecord.example_sentence || '',
  turkish_sentence: dbRecord.example_sentence_tr || dbRecord.turkish_sentence || '',
  created_at: dbRecord.created_at,
  user_id: dbRecord.user_id,
  set_name: dbRecord.set_name || undefined,
  is_archived: !!dbRecord.is_archived,
  category: dbRecord.category || undefined,
  word_type: dbRecord.word_type || dbRecord.type || undefined
});

const mapAppToDb = (word: Omit<Word, 'id' | 'created_at'>, userId?: string, includeArchiveField: boolean = true) => {
  const payload: any = {
    word_en: word.english.trim(),
    word_tr: word.turkish.trim(),
    example_sentence_en: (word.example_sentence || '').trim(),
    example_sentence_tr: (word.turkish_sentence || '').trim(),
    user_id: userId || null,
    set_name: word.set_name || null
  };

  if (includeArchiveField) {
    payload.is_archived = !!word.is_archived;
  }

  return payload;
};

export const wordService = {
  getCachedWords(): Word[] {
    return getLocalWords();
  },

  clearCache() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem('lingua_flashcard_active_ids');
    localStorage.removeItem('lingua_flashcard_current_index');
    localStorage.removeItem('lingua_flashcard_is_finished');
    localStorage.removeItem('lingua_flashcard_direction');
  },

  async getAllWords(userId?: string): Promise<Word[]> {
    try {
      let query = supabase.from('words').select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;

      if (error) {
        console.warn("Supabase Fetch Warning (Şema hatası olabilir):", error.message);
      }

      if (!error && data) {
        const remoteWords = data.map(mapDbToApp);
        setLocalWords(remoteWords);
        return remoteWords;
      }
    } catch (e) {
      console.error("Critical Word Fetch Error:", e);
    }
    return getLocalWords();
  },

  async getLibraryWords(level: string = 'A1'): Promise<Word[]> {
    const targetLevel = (level || 'A1').toUpperCase().trim();

    // If level is A1, check local bundle first for instant loading
    if (targetLevel === 'A1' && Array.isArray(a1WordsData) && a1WordsData.length > 0) {
      // Background sync check with Supabase DB
      try {
        const { data, error } = await supabase
          .from('words')
          .select('*')
          .is('user_id', null)
          .eq('set_name', 'A1');

        if (!error && data && data.length > 0) {
          return data.map(mapDbToApp);
        }
      } catch (e) {
        console.warn("Supabase library fetch error, returning local A1 bundle:", e);
      }
      return a1WordsData as Word[];
    }

    try {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .is('user_id', null)
        .eq('set_name', targetLevel);

      if (!error && data && data.length > 0) {
        return data.map(mapDbToApp);
      }
    } catch (e) {
      console.warn("Library words fetch warning:", e);
    }

    return [];
  },

  async toggleArchive(id: string, isArchived: boolean): Promise<void> {
    const current = getLocalWords();
    setLocalWords(current.map(w => w.id === id ? { ...w, is_archived: isArchived } : w));

    try {
      const { error } = await supabase.from('words').update({ is_archived: isArchived }).eq('id', id);
      if (error && error.message.includes('is_archived')) {
        console.error("Arşivleme özelliği veritabanında henüz aktif değil.");
      }
    } catch (e) { }
  },

  async addWord(word: Omit<Word, 'id' | 'created_at'>, userId?: string): Promise<Word | null> {
    const nowIso = new Date().toISOString();
    const fallbackLocalWord: Word = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `w_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      english: word.english.trim(),
      turkish: (word.turkish || word.english).trim(),
      example_sentence: word.example_sentence || '',
      turkish_sentence: word.turkish_sentence || '',
      created_at: nowIso,
      user_id: userId,
      set_name: word.set_name || undefined,
      category: word.category || undefined,
      word_type: word.word_type || undefined,
      is_archived: !!word.is_archived
    };

    try {
      const payload = mapAppToDb(word, userId, true);
      let { data, error } = await supabase.from('words').insert([payload]).select().single();

      if (error && error.message.includes('is_archived')) {
        const fallbackPayload = mapAppToDb(word, userId, false);
        const retry = await supabase.from('words').insert([fallbackPayload]).select().single();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        const dbWord = mapDbToApp(data);
        if (word.category) dbWord.category = word.category;
        if (word.word_type) dbWord.word_type = word.word_type;

        const updated = [dbWord, ...getLocalWords().filter(w => w.id !== dbWord.id)];
        setLocalWords(updated);
        return dbWord;
      }
    } catch (e) {
      // Supabase hatası durumunda yerel depolamaya yedeklenir
    }

    // Yerel depolamaya kaydet ve kelimeyi döndür (offline/schema resilient)
    const currentLocal = getLocalWords().filter(w => w.id !== fallbackLocalWord.id);
    const updatedLocal = [fallbackLocalWord, ...currentLocal];
    setLocalWords(updatedLocal);
    return fallbackLocalWord;
  },

  async addWordsBulk(words: Omit<Word, 'id' | 'created_at'>[], userId?: string): Promise<Word[]> {
    if (!words || words.length === 0) return [];

    // Filter duplicates against local storage if needed
    const currentLocal = getLocalWords();
    const localEngSet = new Set(currentLocal.map(w => w.english.toLowerCase().trim()));

    // Always create valid fallback local Word objects first
    const nowIso = new Date().toISOString();
    const fallbackLocalWords: Word[] = words.map(w => ({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `w_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      english: w.english.trim(),
      turkish: (w.turkish || w.english).trim(),
      example_sentence: w.example_sentence || '',
      turkish_sentence: w.turkish_sentence || '',
      created_at: nowIso,
      user_id: userId,
      set_name: w.set_name || undefined,
      category: w.category || undefined,
      word_type: w.word_type || undefined
    }));

    // Filter out items that are already in local storage
    const uniqueLocalWords = fallbackLocalWords.filter(w => !localEngSet.has(w.english.toLowerCase()));
    const finalLocalToAdd = uniqueLocalWords.length > 0 ? uniqueLocalWords : fallbackLocalWords;

    // Try Supabase insert
    try {
      let payload = words.map(w => mapAppToDb(w, userId, true));
      let { data, error } = await supabase.from('words').insert(payload).select();

      if (error && (error.message.includes('is_archived') || error.message.includes('category') || error.message.includes('word_type'))) {
        payload = words.map(w => {
          const p = mapAppToDb(w, userId, false);
          delete p.category;
          delete p.word_type;
          return p;
        });
        const retry = await supabase.from('words').insert(payload).select();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data && data.length > 0) {
        const addedRemote = data.map(mapDbToApp);
        const updatedLocal = [...addedRemote, ...currentLocal];
        setLocalWords(updatedLocal);
        return addedRemote;
      }
    } catch (e) {
      console.warn("Supabase Bulk Insert warning, using local fallback:", e);
    }

    // Fallback to local storage
    const updatedLocal = [...finalLocalToAdd, ...currentLocal];
    setLocalWords(updatedLocal);
    return finalLocalToAdd;
  },

  async deleteWord(id: string): Promise<void> {
    setLocalWords(getLocalWords().filter(w => w.id !== id));
    try {
      await supabase.from('words').delete().eq('id', id);
    } catch (e) {
      console.warn("deleteWord Supabase warning:", e);
    }
  },

  async deleteWords(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    setLocalWords(getLocalWords().filter(w => !ids.includes(w.id)));
    try {
      const { error } = await supabase.from('words').delete().in('id', ids);
      if (error) {
        console.warn("deleteWords Supabase warning:", error.message);
      }
    } catch (e) {
      console.warn("deleteWords exception:", e);
    }
  },

  async renameCustomSet(oldName: string, newName: string): Promise<void> {
    const current = getLocalWords();
    setLocalWords(current.map(w => w.set_name === oldName ? { ...w, set_name: newName } : w));
    await supabase.from('words').update({ set_name: newName }).eq('set_name', oldName);
  },

  async deleteCustomSet(setName: string): Promise<void> {
    setLocalWords(getLocalWords().filter(w => !w.set_name || w.set_name !== setName));
    await supabase.from('words').delete().eq('set_name', setName);
  },

  // User Progress Methods for Flashcards ("Öğrendim / Öğrenmedim / Biliyorum")
  async saveUserProgress(wordId: string, status: WordProgressStatus, userId?: string): Promise<void> {
    // 1. Local Storage update
    try {
      const existingStr = localStorage.getItem(LOCAL_PROGRESS_KEY);
      const progressMap: Record<string, WordProgressStatus> = existingStr ? JSON.parse(existingStr) : {};
      progressMap[wordId] = status;
      localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progressMap));
    } catch (e) {
      console.error("Failed to save local word progress:", e);
    }

    // 2. Supabase DB update if user logged in
    if (userId) {
      try {
        await supabase.from('user_progress').upsert({
          user_id: userId,
          word_id: wordId,
          status,
          module: 'flashcards',
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,word_id,module' });
      } catch (e) {
        console.warn("user_progress upsert warning:", e);
      }
    }
  },

  async getUserProgress(userId?: string): Promise<Record<string, WordProgressStatus>> {
    let localProgress: Record<string, WordProgressStatus> = {};
    try {
      const stored = localStorage.getItem(LOCAL_PROGRESS_KEY);
      if (stored) localProgress = JSON.parse(stored);
    } catch (e) {}

    if (userId) {
      try {
        const { data, error } = await supabase
          .from('user_progress')
          .select('word_id, status')
          .eq('user_id', userId)
          .eq('module', 'flashcards');

        if (!error && data) {
          const remoteProgress: Record<string, WordProgressStatus> = {};
          data.forEach(item => {
            remoteProgress[item.word_id] = item.status as WordProgressStatus;
          });
          const merged = { ...localProgress, ...remoteProgress };
          localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(merged));
          return merged;
        }
      } catch (e) {
        console.warn("Error fetching remote user progress:", e);
      }
    }

    return localProgress;
  }
};
