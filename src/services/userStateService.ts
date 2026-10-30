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
  'library_inputs_',
  'library_wrong_',
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
        // Remote is the authoritative state from the cloud
        const strVal = typeof val === 'string' ? val : JSON.stringify(val);
        localStorage.setItem(key, strVal);
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
        // Apply remote state to local storage (remote is the authoritative source of truth)
        applyRemoteStudyState(remoteState);

        // If local has offline or pre-existing keys completely missing in remote, seed them
        const currentLocal = getLocalStudyState();
        const missingInRemote: Record<string, string> = {};
        let hasMissing = false;

        Object.entries(currentLocal).forEach(([k, localVal]) => {
          if (!(k in remoteState)) {
            missingInRemote[k] = localVal;
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

  subscribeToStudyState(userId: string, onUpdate?: () => void): () => void {
    if (!userId) return () => {};
    let channel: any = null;

    try {
      channel = supabase
        .channel(`realtime_study_state_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_study_state',
            filter: `user_id=eq.${userId}`
          },
          (payload: any) => {
            const newState = payload?.new?.state;
            if (newState && typeof newState === 'object') {
              applyRemoteStudyState(newState);
              window.dispatchEvent(new CustomEvent('lingua_study_state_updated'));
              if (onUpdate) onUpdate();
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("Failed to subscribe to realtime study state:", e);
    }

    return () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch {}
      }
    };
  },

  async saveStateKey(userId?: string | null, key: string, value: any, immediate: boolean = false): Promise<void> {
    if (!key || value === undefined || value === null) return;
    const strVal = typeof value === 'string' ? value : JSON.stringify(value);

    // 1. Always update local storage immediately for 0ms lag
    try {
      localStorage.setItem(key, strVal);
    } catch (e) {}

    const targetUserId = userId || activeUserId;
    if (!targetUserId) return;
    activeUserId = targetUserId;
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
      }, 200);
    }
  },

  async saveStateBulk(userId?: string | null, updates: Record<string, any> = {}): Promise<void> {
    const targetUserId = userId || activeUserId;
    if (!targetUserId || !updates || Object.keys(updates).length === 0) return;
    activeUserId = targetUserId;

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
