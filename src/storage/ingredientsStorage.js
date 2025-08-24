import { MMKV } from "react-native-mmkv";

const storage = new MMKV();

const INGREDIENTS_KEY = "ingredients"; // stores list of ids
const INGREDIENT_PREFIX = "ingredient:";

export async function getAllIngredients() {
  const json = storage.getString(INGREDIENTS_KEY);
  const ids = json ? JSON.parse(json) : [];
  if (!Array.isArray(ids) || ids.length === 0) return [];
  if (typeof ids[0] === "object") {
    // migrate from old array storage
    await saveAllIngredients(ids);
    return ids;
  }
  return ids
    .map((id) => {
      const raw = storage.getString(`${INGREDIENT_PREFIX}${id}`);
      return raw ? JSON.parse(raw) : null;
    })
    .filter(Boolean);
}

export function buildIndex(list) {
  return list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

export async function saveAllIngredients(ingredients) {
  const ids = ingredients.map((i) => String(i.id));

  const existing = storage.getString(INGREDIENTS_KEY);
  const existingIds = existing ? JSON.parse(existing) : [];
  const toRemove = existingIds.filter((id) => !ids.includes(String(id)));
  toRemove.forEach((id) => storage.delete(`${INGREDIENT_PREFIX}${id}`));

  ingredients.forEach((i) => {
    storage.set(`${INGREDIENT_PREFIX}${i.id}`, JSON.stringify(i));
  });
  storage.set(INGREDIENTS_KEY, JSON.stringify(ids));
}

export function updateIngredientById(list, updated) {
  const index = list.findIndex((i) => i.id === updated.id);
  if (index === -1) return list;
  const next = [...list];
  next[index] = { ...next[index], ...updated };
  return next;
}

export async function saveIngredient(ingredient) {
  const key = `${INGREDIENT_PREFIX}${ingredient.id}`;
  storage.set(key, JSON.stringify(ingredient));
  const json = storage.getString(INGREDIENTS_KEY);
  const ids = json ? JSON.parse(json) : [];
  if (!ids.includes(String(ingredient.id))) {
    ids.push(String(ingredient.id));
    storage.set(INGREDIENTS_KEY, JSON.stringify(ids));
  }
}

export function addIngredient(list, ingredient) {
  return [
    ...list,
    {
      ...ingredient,
      inBar: false,
      inShoppingList: false,
      baseIngredientId: ingredient.baseIngredientId ?? null,
    },
  ];
}

export function getIngredientById(id, index) {
  return index ? index[id] : null;
}

export function deleteIngredient(list, id) {
  return list.filter((item) => item.id !== id);
}
