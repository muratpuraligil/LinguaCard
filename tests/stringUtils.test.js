import test from 'node:test';
import assert from 'node:assert/strict';

// Node.js runner ES module import
import { isMatch, getLocalDateString } from '../src/utils/stringUtils.ts';

test('isMatch - tam ve normalize eşleşmeler', () => {
  assert.equal(isMatch('hello', 'hello'), true);
  assert.equal(isMatch('Hello!', 'hello'), true);
  assert.equal(isMatch('HELLO.', 'hello'), true);
});

test('isMatch - İngilizce kısaltmalar (contractions)', () => {
  assert.equal(isMatch("I'm a student", "I am a student"), true);
  assert.equal(isMatch("Don't go", "Do not go"), true);
  assert.equal(isMatch("We'll see", "We will see"), true);
  assert.equal(isMatch("It's fine", "It is fine"), true);
});

test('isMatch - yanlış cevap reddetme', () => {
  assert.equal(isMatch("I am a doctor", "I am a student"), false);
  assert.equal(isMatch("Yes", "No"), false);
});

test('getLocalDateString - tarih formatı', () => {
  const formatted = getLocalDateString('2026-09-03T10:00:00Z');
  assert.match(formatted, /^\d{2}\.\d{2}\.\d{4}$/);
});
