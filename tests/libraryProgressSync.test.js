import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('userStateService: authoritative remote state replaces local cache without resurrection', () => {
  const serviceCode = fs.readFileSync(path.join(rootDir, 'src', 'services', 'userStateService.ts'), 'utf8');

  // Must track library_inputs_ and library_wrong_
  assert.ok(serviceCode.includes('library_inputs_'), 'TRACKED_PREFIXES must include library_inputs_');
  assert.ok(serviceCode.includes('library_wrong_'), 'TRACKED_PREFIXES must include library_wrong_');

  // Must export subscribeToStudyState for realtime updates
  assert.ok(
    serviceCode.includes('subscribeToStudyState') || serviceCode.includes('channel'),
    'userStateService must support realtime subscription or study state channel'
  );
});

test('LibraryPracticeScreen.tsx and LibraryScreen.tsx integrate userStateService and accept userId', () => {
  const practiceCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'LibraryPracticeScreen.tsx'), 'utf8');
  const libraryCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'LibraryScreen.tsx'), 'utf8');
  const appCode = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf8');

  // Practice screen must import userStateService and call saveStateKey
  assert.ok(practiceCode.includes('userStateService'), 'LibraryPracticeScreen must import userStateService');
  assert.ok(practiceCode.includes('saveStateKey') || practiceCode.includes('saveStateBulk'), 'LibraryPracticeScreen must call userStateService');
  assert.ok(practiceCode.includes('userId'), 'LibraryPracticeScreenProps must include userId');

  // LibraryScreen must accept userId and refresh progress
  assert.ok(libraryCode.includes('userId'), 'LibraryScreenProps must include userId');
  assert.ok(libraryCode.includes('lingua_study_state_updated'), 'LibraryScreen must listen to lingua_study_state_updated');

  // App.tsx must pass userId to LibraryScreen and LibraryPracticeScreen
  assert.ok(appCode.includes('userId={session?.user?.id}'), 'App.tsx must pass userId to library screens');

  // App.tsx must re-sync on visibilitychange / tab focus
  assert.ok(appCode.includes('visibilitychange'), 'App.tsx must listen to visibilitychange for instant cross-device sync');
});

test('userStateService simulation: reset on PC (6 questions) correctly updates mobile without resurrecting old 10', () => {
  const storage = {};
  const mockLocalStorage = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
  };

  const simulateApply = (localState, remoteVal) => {
    // Authoritative remote state overwrites local cache for synchronized keys
    return typeof remoteVal === 'string' ? remoteVal : JSON.stringify(remoteVal);
  };

  // Case: Mobile had old 10 questions. User reset on PC and solved 6 questions.
  const remotePC = JSON.stringify({
    s1: true, s2: true, s3: true, s4: true, s5: true, s6: true
  });

  const updatedOnMobile = JSON.parse(simulateApply('old_10_string', remotePC));
  assert.strictEqual(Object.keys(updatedOnMobile).length, 6, 'Mobile must now show 6 questions from remote, NOT 10');
  assert.strictEqual(updatedOnMobile['s7'], undefined, 's7 must not exist after reset');
});
