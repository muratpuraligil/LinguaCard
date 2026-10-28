import { supabase } from './supabaseClient';

const TRACKED_PREFIXES = [
  'lingua_flashcard_set_num_',
  'lingua_flashcard_current_index_',
  'lingua_flashcard_active_ids_',
  'lingua_quiz_set_num_',
  'lingua_quiz_current_index_',
  'lingua_quiz_active_ids_',
  'library_progress_',
  'library_completed_',
  'lingua_custom_progress_'
];

const TRACKED_EXACT_KEYS = [
  'lingua_flashcard_last_level',
  'lingua_flashcard_library_scope',
  'lingua_flashcard_direction',
  'lingua_quiz_last_level',
  'lingua_quiz_direction',
  'lingua_sentence_index',
  'lingua_sentence_max_reached',
  'lingua_sentence_direction',
  'lingua_global_offset'
];

export const isStudyStateKey = (key: string): boolean => {
  if (!key || typeof key !== 'string') return false;
  return TRACKED_EXACT_KEYS.includes(key) || TRACKED_PREFIXES.some(prefix => key.startsWith(prefix));
};

export const getLocalStudyState = (): Record<string, string> => {
  const result: Record<string, string> = {};
  if (typeof localStorage === 'undefined') return result;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isStudyStateKey(key)) {
        const val = localStorage.getItem(key);
        if (val !== null) {
          result[key] = val;
        }
      }
    }
  } catch (e) {
    console.warn("Failed to read local study state snapshot:", e);
  }
  return result;
};

export const applyRemoteStudyState = (remoteState: Record<string, any>): void => {
  if (!remoteState || typeof remoteState !== 'object' || typeof localStorage === 'undefined') return;

  try {
    Object.entries(remoteState).forEach(([key, val]) => {
      if (isStudyStateKey(key) && val !== undefined && val !== null) {
        const currentLocal = localStorage.getItem(key);

        // If local is empty, or remote has value, apply remote
        // For set numbers and indices, if local has default '1' or '0' and remote has a higher progress, prioritize remote
        if (!currentLocal) {
          localStorage.setItem(key, String(val));
        } else if (key.includes('_set_num_') || key.includes('_index')) {
          const localNum = parseInt(currentLocal, 10);
          const remoteNum = parseInt(String(val), 10);
          if (!isNaN(remoteNum) && (!isNaN(localNum) ? remoteNum >= localNum : true)) {
            localStorage.setItem(key, String(val));
          }
        } else {
          // For levels, scopes, settings: update to remote
          localStorage.setItem(key, String(val));
        }
      }
    });
  } catch (e) {
    console.warn("Failed to apply remote study state to localStorage:", e);
  }
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingStateBuffer: Record<string, string> = {};
let activeUserId: string | null = null;

const flushPendingUpdates = async () => {
  if (!activeUserId || Object.keys(pendingStateBuffer).length === 0) return;

  const userId = activeUserId;
  const updatesToFlush = { ...pendingStateBuffer };
  pendingStateBuffer = {};

  try {
    // 1. Fetch current remote state to do a deep merge
    const { data, error } = await supabase
      .from('user_study_state')
      .select('state')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist yet, warn softly and keep working locally
      console.warn("user_study_state fetch warning (schema might not be applied yet):", error.message);
    }

    const currentRemote = (data && data.state && typeof data.state === 'object') ? data.state : {};
    const mergedState = {
      ...currentRemote,
      ...updatesToFlush
    };

    // 2. Upsert merged state
    const { error: upsertError } = await supabase
      .from('user_study_state')
      .upsert({
        user_id: userId,
        state: mergedState,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.warn("user_study_state upsert warning:", upsertError.message);
    }
  } catch (e) {
    console.warn("Exception during user_study_state flush:", e);
  }
};

export const userStateService = {
  isStudyStateKey,
  getLocalStudyState,
  applyRemoteStudyState,

  async syncRemoteToLocal(userId: string): Promise<boolean> {
    if (!userId) return false;
    activeUserId = userId;

    try {
      // 1. Fetch user's study state from Supabase
      const { data, error } = await supabase
        .from('user_study_state')
        .select('state, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.warn("syncRemoteToLocal fetch warning:", error.message);
        }
        return false;
      }

      const remoteState = data?.state;
      const localState = getLocalStudyState();

      if (remoteState && typeof remoteState === 'object' && Object.keys(remoteState).length > 0) {
        // Apply remote state to local storage
        applyRemoteStudyState(remoteState);

        // If local has additional keys not yet in remote, merge local back to remote
        const missingInRemote: Record<string, string> = {};
        let hasMissing = false;
        Object.entries(localState).forEach(([k, v]) => {
          if (!(k in remoteState)) {
            missingInRemote[k] = v;
            hasMissing = true;
          }
        });

        if (hasMissing) {
          await this.saveStateBulk(userId, missingInRemote);
        }

        return true;
      } else if (Object.keys(localState).length > 0) {
        // If remote has no state yet but local has existing progress, seed remote state from local
        await this.saveStateBulk(userId, localState);
        return true;
      }

      return false;
    } catch (e) {
      console.warn("Exception in syncRemoteToLocal:", e);
      return false;
    }
  },

  async saveStateKey(userId: string, key: string, value: any, immediate: boolean = false): Promise<void> {
    if (!key || value === undefined || value === null) return;
    const strVal = String(value);

    // 1. Always update local storage immediately for 0ms lag
    try {
      localStorage.setItem(key, strVal);
    } catch (e) {}

    if (!userId) return;
    activeUserId = userId;
    pendingStateBuffer[key] = strVal;

    if (immediate) {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      await flushPendingUpdates();
    } else {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        flushPendingUpdates();
      }, 600);
    }
  },

  async saveStateBulk(userId: string, updates: Record<string, any>): Promise<void> {
    if (!userId || !updates || Object.keys(updates).length === 0) return;
    activeUserId = userId;

    Object.entries(updates).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        pendingStateBuffer[k] = String(v);
        try {
          localStorage.setItem(k, String(v));
        } catch (e) {}
      }
    });

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    await flushPendingUpdates();
  }
};
