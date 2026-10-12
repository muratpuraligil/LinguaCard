import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function createMockValidSession() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const validJwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    Buffer.from(JSON.stringify({ exp, sub: 'user-123' })).toString('base64url') +
    '.sig';
  return {
    access_token: validJwt,
    refresh_token: 'refresh-token-123',
    expires_at: exp,
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: 'user-123', email: 'test@linguacard.app' }
  };
}

test('App.tsx must not await Supabase queries directly inside onAuthStateChange callback (prevents initializePromise deadlock)', () => {
  const appSource = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');

  // Extract the onAuthStateChange block up to its closing });
  const match = appSource.match(/onAuthStateChange\s*\(([\s\S]*?\}\s*)\)\s*;/);
  assert.ok(match, 'onAuthStateChange registration must exist in src/App.tsx');

  const callbackBody = match[1];
  const hasDirectAsyncAwaitGetAllWords =
    /async\s*\([^)]*\)\s*=>[\s\S]*?await\s+wordService\.getAllWords/.test(callbackBody);

  assert.equal(
    hasDirectAsyncAwaitGetAllWords,
    false,
    'onAuthStateChange callback must NOT be an async function that directly awaits wordService.getAllWords, because GoTrueClient._initialize awaits _notifyAllSubscribers while getAllWords awaits GoTrueClient.initializePromise (circular deadlock)'
  );
});

test('supabaseClient.ts must configure a timeout-safe lock to prevent hung Web Locks from freezing session init', () => {
  const clientSource = fs.readFileSync(path.join(rootDir, 'src/services/supabaseClient.ts'), 'utf8');
  assert.match(
    clientSource,
    /lock\s*:/,
    'supabaseClient.ts must provide a custom timeout-safe lock function in auth options'
  );
});

test('Supabase session recovery + onAuthStateChange word fetch completes without deadlock when deferred', async () => {
  const sessionObj = createMockValidSession();
  const store = new Map([['sb-test-auth-token', JSON.stringify(sessionObj)]]);
  const storage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k)
  };

  const mockFetch = async () =>
    new Response(JSON.stringify([{ id: 'w1', word_en: 'hello', word_tr: 'merhaba' }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  const supabase = createClient('https://example.supabase.co', 'anon-key', {
    auth: {
      storage,
      storageKey: 'sb-test-auth-token',
      persistSession: true,
      autoRefreshToken: false
    },
    global: { fetch: mockFetch }
  });

  let loadingSession = true;
  let resolvedSession = null;

  const initPromise = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      resolvedSession = session;
    } finally {
      loadingSession = false;
    }
  })();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      setTimeout(() => {
        supabase.from('words').select('*').eq('user_id', session.user.id);
      }, 0);
    }
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Session initialization timed out (deadlock)')), 1000)
  );

  await Promise.race([initPromise, timeoutPromise]);
  subscription.unsubscribe();

  assert.equal(loadingSession, false, 'loadingSession must become false');
  assert.equal(resolvedSession?.user?.id, 'user-123', 'Session user must be recovered');
});
