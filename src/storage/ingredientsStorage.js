import AsyncStorage from "@react-native-async-storage/async-storage";

const INGREDIENTS_KEY = "ingredients"; // stores list of ids
const INGREDIENT_PREFIX = "ingredient:";

export async function getAllIngredients() {
  const json = await AsyncStorage.getItem(INGREDIENTS_KEY);
  const ids = json ? JSON.parse(json) : [];
  if (!Array.isArray(ids) || ids.length === 0) return [];
  if (typeof ids[0] === "object") {
    // migrate from old array storage
    await saveAllIngredients(ids);
    return ids;
  }
  const keys = ids.map((id) => `${INGREDIENT_PREFIX}${id}`);
  const values = await AsyncStorage.multiGet(keys);
  const map = new Map(values);
  return ids
    .map((id) => {
      const raw = map.get(`${INGREDIENT_PREFIX}${id}`);
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
  const keyValues = ingredients.map((i) => [
    `${INGREDIENT_PREFIX}${i.id}`,
    JSON.stringify(i),
  ]);

  const existing = await AsyncStorage.getItem(INGREDIENTS_KEY);
  const existingIds = existing ? JSON.parse(existing) : [];
  const toRemove = existingIds
    .filter((id) => !ids.includes(String(id)))
    .map((id) => `${INGREDIENT_PREFIX}${id}`);
  if (toRemove.length) await AsyncStorage.multiRemove(toRemove);

  await AsyncStorage.multiSet(keyValues);
  await AsyncStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ids));
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
  await AsyncStorage.setItem(key, JSON.stringify(ingredient));
  const json = await AsyncStorage.getItem(INGREDIENTS_KEY);
  const ids = json ? JSON.parse(json) : [];
  if (!ids.includes(String(ingredient.id))) {
    ids.push(String(ingredient.id));
    await AsyncStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ids));
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
