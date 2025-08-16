import AsyncStorage from "@react-native-async-storage/async-storage";

const INGREDIENTS_KEY = "ingredients";

export async function getAllIngredients() {
  const json = await AsyncStorage.getItem(INGREDIENTS_KEY);
  return json ? JSON.parse(json) : [];
}

export function buildIndex(list) {
  return list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

export async function saveAllIngredients(ingredients) {
  await AsyncStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ingredients));
}

export function updateIngredientById(list, updated) {
  const index = list.findIndex((i) => i.id === updated.id);
  if (index === -1) return list;
  const next = [...list];
  next[index] = { ...next[index], ...updated };
  return next;
}

export async function saveIngredient(updatedList) {
  await saveAllIngredients(updatedList);
}

export async function addIngredient(ingredient) {
  const current = await getAllIngredients();
  const newList = [
    ...current,
    {
      ...ingredient,
      inBar: false,
      inShoppingList: false,
      baseIngredientId: ingredient.baseIngredientId ?? null,
    },
  ];
  await saveAllIngredients(newList);
  return ingredient.id;
}

export function getIngredientById(id, index) {
  return index ? index[id] : null;
}

export async function deleteIngredient(id) {
  try {
    const json = await AsyncStorage.getItem(INGREDIENTS_KEY);
    const list = json ? JSON.parse(json) : [];
    const updated = list.filter((item) => item.id !== id);
    await AsyncStorage.setItem(INGREDIENTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to delete ingredient", e);
  }
}
