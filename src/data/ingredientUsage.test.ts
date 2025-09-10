import test from 'node:test';
import assert from 'node:assert/strict';
import { mapCocktailsByIngredient, clearMapCocktailsByIngredientCache } from '../domain/ingredientUsage';

test('mapCocktailsByIngredient memoizes across inShoppingList changes', () => {
  clearMapCocktailsByIngredientCache();
  const ingredients = [
    { id: 1, name: 'Base', inShoppingList: false },
    { id: 2, name: 'Brand', baseIngredientId: 1, inShoppingList: false },
  ];
  const cocktails = [
    { id: 1, name: 'Test', ingredients: [{ ingredientId: 2 }] },
  ];
  const first = mapCocktailsByIngredient(ingredients, cocktails);
  const updated = ingredients.map((i) => ({ ...i, inShoppingList: !i.inShoppingList }));
  const second = mapCocktailsByIngredient(updated, cocktails);
  assert.strictEqual(first, second);
});
