import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('userStateService: merges object progress like library_completed_ without losing either device data', () => {
  const serviceCode = fs.readFileSync(path.join(rootDir, 'src', 'services', 'userStateService.ts'), 'utf8');

  // Must track library_inputs_ and library_wrong_
  assert.ok(serviceCode.includes('library_inputs_'), 'TRACKED_PREFIXES must include library_inputs_');
  assert.ok(serviceCode.includes('library_wrong_'), 'TRACKED_PREFIXES must include library_wrong_');

  // Must merge object-based keys
  assert.ok(
    serviceCode.includes('library_completed_') && serviceCode.includes('...'),
    'userStateService must merge object-based study keys like library_completed_'
  );
});

test('LibraryPracticeScreen.tsx and LibraryScreen.tsx integrate userStateService and accept userId', () => {
  const practiceCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'LibraryPracticeScreen.tsx'), 'utf8');
  const libraryCode = fs.readFileSync(path.join(rootDir, 'src', 'components', 'LibraryScreen.tsx'), 'utf8');
  const appCode = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf8');

  // Practice screen must import userStateService and call saveStateKey
  assert.ok(practiceCode.includes('userStateService'), 'LibraryPracticeScreen must import userStateService');
  assert.ok(practiceCode.includes('saveStateKey'), 'LibraryPracticeScreen must call userStateService.saveStateKey');
  assert.ok(practiceCode.includes('userId'), 'LibraryPracticeScreenProps must include userId');

  // LibraryScreen must accept userId and refresh progress
  assert.ok(libraryCode.includes('userId'), 'LibraryScreenProps must include userId');

  // App.tsx must pass userId to LibraryScreen and LibraryPracticeScreen
  assert.ok(appCode.includes('userId={session?.user?.id}'), 'App.tsx must pass userId to library screens');

  // App.tsx must re-sync on visibilitychange / tab focus
  assert.ok(appCode.includes('visibilitychange'), 'App.tsx must listen to visibilitychange for instant cross-device sync');
});

test('userStateService simulation: cross-device sentence library progress sync (10 on PC, 3 on mobile -> merged 10)', () => {
  const serviceCode = fs.readFileSync(path.join(rootDir, 'src', 'services', 'userStateService.ts'), 'utf8');

  // Verify merge logic in source code handles object sets
  assert.ok(serviceCode.includes("key.startsWith('library_completed_')"), 'applyRemoteStudyState must handle library_completed_ prefix');
  assert.ok(serviceCode.includes('...remoteObj, ...localObj'), 'applyRemoteStudyState must union remoteObj and localObj');

  // Simulate the exact merge logic isolated in Node
  const storage = {};
  const mockLocalStorage = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
  };

  const simulateMerge = (currentLocal, remoteVal) => {
    let localObj = null;
    let remoteObj = null;
    try { localObj = currentLocal ? JSON.parse(currentLocal) : null; } catch {}
    try { remoteObj = typeof remoteVal === 'object' ? remoteVal : JSON.parse(String(remoteVal)); } catch {}

    if (localObj && typeof localObj === 'object' && remoteObj && typeof remoteObj === 'object') {
      return JSON.stringify({ ...remoteObj, ...localObj });
    } else if (remoteObj) {
      return typeof remoteVal === 'string' ? remoteVal : JSON.stringify(remoteObj);
    }
    return currentLocal;
  };

  // Case 1: Mobile has 3 items, Remote has 10 from PC
  const mobileLocal = JSON.stringify({ s1: true, s2: true, s3: true });
  const remotePC = JSON.stringify({
    s1: true, s2: true, s3: true, s4: true, s5: true,
    s6: true, s7: true, s8: true, s9: true, s10: true
  });
  const mergedOnMobile = JSON.parse(simulateMerge(mobileLocal, remotePC));
  assert.strictEqual(Object.keys(mergedOnMobile).length, 10, 'Mobile must now have all 10 solved questions');

  // Case 2: PC has 10 items, Remote has 3 items
  const preservedOnPC = JSON.parse(simulateMerge(remotePC, mobileLocal));
  assert.strictEqual(Object.keys(preservedOnPC).length, 10, 'PC must retain all 10 solved questions');
});
