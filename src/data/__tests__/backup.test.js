import test from 'node:test';
import assert from 'node:assert/strict';
import { stripFalse } from '../stripFalse.js';
import { normalizeImportData } from '../normalizeBackupData.js';

test('stripFalse removes empty arrays, objects, and null values', () => {

  const data = {
    emptyArr: [],
    emptyObj: {},
    nullVal: null,
    nested: { arr: [], obj: {}, baseIngredientId: null },
    list: [null, {}],
    keep: [1, { a: 1 }, [2]],
  };

  assert.deepEqual(stripFalse(data), { keep: [1, { a: 1 }, [2]] });
});

test('normalizeImportData restores omitted arrays', () => {
  const sample = {
    cocktails: [
      {
        id: 1,
        name: 'Test',
        ingredients: [{ ingredientId: 2 }],
      },
    ],
  };
  const { ingredients, cocktails } = normalizeImportData(sample, () => null);
  assert.deepEqual(ingredients, []);
  assert.deepEqual(cocktails, [
    {
      id: 1,
      name: 'Test',
      photoUri: null,
      ingredients: [
        {
          ingredientId: 2,
          substitutes: [],
          garnish: false,
          optional: false,
          allowBaseSubstitution: false,
          allowBrandedSubstitutes: false,
        },
      ],
    },
  ]);
});

test('normalizeImportData sets missing baseIngredientId to null', () => {
  const sample = {
    ingredients: [
      { id: 1, name: 'Vodka' },
    ],
  };
  const { ingredients } = normalizeImportData(sample, () => null);
  assert.deepEqual(ingredients, [
    {
      id: 1,
      name: 'Vodka',
      baseIngredientId: null,
      photoUri: null,
      inBar: false,
      inShoppingList: false,
    },
  ]);
});

