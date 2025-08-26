import test from 'node:test';
import assert from 'node:assert/strict';
import { sortByName } from '../sortByName.js';

test('orders by name ascending ignoring case', () => {
  const arr = [{ name: 'b' }, { name: 'A' }];
  arr.sort((a, b) => sortByName(a, b));
  assert.deepEqual(arr, [{ name: 'A' }, { name: 'b' }]);
});

test('handles missing names as empty strings', () => {
  const arr = [{}, { name: 'a' }];
  arr.sort((a, b) => sortByName(a, b));
  assert.deepEqual(arr, [{}, { name: 'a' }]);
});
