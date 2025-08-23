import AsyncStorage from "@react-native-async-storage/async-storage";

const INGREDIENTS_KEY = "ingredients";

let cache = null;
let flushTimer = null;
const FLUSH_DELAY = 500;

async function loadCache() {
  if (cache) return cache;
  const json = await AsyncStorage.getItem(INGREDIENTS_KEY);
  cache = json ? JSON.parse(json) : [];
  return cache;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    try {
      await AsyncStorage.setItem(INGREDIENTS_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn("Failed to flush ingredients", e);
    }
  }, FLUSH_DELAY);
}

export async function getAllIngredients() {
  return await loadCache();
}

export function buildIndex(list) {
  return list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

export async function saveAllIngredients(ingredients) {
  cache = [...ingredients];
  scheduleFlush();
}

export function updateIngredientById(list, updated) {
  const index = list.findIndex((i) => i.id === updated.id);
  if (index === -1) return list;
  const next = [...list];
  next[index] = { ...next[index], ...updated };
  return next;
}

export async function saveIngredient(updatedList) {
  cache = [...updatedList];
  scheduleFlush();
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
