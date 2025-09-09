import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSearch } from '../normalizeSearch';

test('normalizes diacritics and case', () => {
  assert.equal(normalizeSearch('Éxámple'), 'example');
});

test('handles null values', () => {
  assert.equal(normalizeSearch(null), '');
});
