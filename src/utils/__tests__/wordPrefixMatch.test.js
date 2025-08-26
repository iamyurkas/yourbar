import test from 'node:test';
import assert from 'node:assert/strict';
import { wordPrefixMatch } from '../wordPrefixMatch.js';

test('matches sequential prefixes in order', () => {
  assert.equal(wordPrefixMatch(['hello', 'world'], ['he', 'wo']), true);
});

test('returns false when tokens not found', () => {
  assert.equal(wordPrefixMatch(['hello', 'world'], ['he', 'zz']), false);
});

test('returns false for invalid inputs', () => {
  assert.equal(wordPrefixMatch(null, ['he']), false);
  assert.equal(wordPrefixMatch(['hello'], null), false);
});
