import AsyncStorage from "@react-native-async-storage/async-storage";

const INGREDIENT_INDEX_KEY = "ingredients/index";
const INGREDIENT_KEY_PREFIX = "ingredients/";
const ingredientKey = (id) => `${INGREDIENT_KEY_PREFIX}${id}`;

export async function getAllIngredients() {
  const indexJson = await AsyncStorage.getItem(INGREDIENT_INDEX_KEY);
  const ids = indexJson ? JSON.parse(indexJson) : [];
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const keys = ids.map(ingredientKey);
  const pairs = await AsyncStorage.multiGet(keys);
  return pairs
    .map(([_, value]) => {
      try {
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function saveAllIngredients(ingredients) {
  const list = Array.isArray(ingredients) ? ingredients : [];
  const ids = list.map((i) => i.id);
  const pairs = list.map((i) => [ingredientKey(i.id), JSON.stringify(i)]);
  pairs.push([INGREDIENT_INDEX_KEY, JSON.stringify(ids)]);

  // remove ingredients that are no longer present
  const oldIndexJson = await AsyncStorage.getItem(INGREDIENT_INDEX_KEY);
  const oldIds = oldIndexJson ? JSON.parse(oldIndexJson) : [];
  const toRemove = oldIds
    .filter((id) => !ids.includes(id))
    .map((id) => ingredientKey(id));
  if (toRemove.length > 0) {
    await AsyncStorage.multiRemove(toRemove);
  }
  await AsyncStorage.multiSet(pairs);
}

export async function saveIngredient(updatedIngredient) {
  const key = ingredientKey(updatedIngredient.id);
  const existingJson = await AsyncStorage.getItem(key);
  if (!existingJson) {
    console.warn("Ingredient not found:", updatedIngredient.id);
    return;
  }
  let existing;
  try {
    existing = JSON.parse(existingJson);
  } catch {
    existing = {};
  }
  const merged = { ...existing, ...updatedIngredient };
  await AsyncStorage.multiSet([[key, JSON.stringify(merged)]]);
}

export async function addIngredient(ingredient) {
  const indexJson = await AsyncStorage.getItem(INGREDIENT_INDEX_KEY);
  const ids = indexJson ? JSON.parse(indexJson) : [];
  const item = {
    ...ingredient,
    inBar: false,
    inShoppingList: false,
    baseIngredientId: ingredient.baseIngredientId ?? null,
  };
  ids.push(item.id);
  const pairs = [
    [ingredientKey(item.id), JSON.stringify(item)],
    [INGREDIENT_INDEX_KEY, JSON.stringify(ids)],
  ];
  await AsyncStorage.multiSet(pairs);
  return item.id;
}

export async function getIngredientById(id) {
  const json = await AsyncStorage.getItem(ingredientKey(id));
  return json ? JSON.parse(json) : null;
}

export async function deleteIngredient(id) {
  try {
    const indexJson = await AsyncStorage.getItem(INGREDIENT_INDEX_KEY);
    const ids = indexJson ? JSON.parse(indexJson) : [];
    const filtered = ids.filter((itemId) => itemId !== id);
    await AsyncStorage.multiRemove([ingredientKey(id)]);
    await AsyncStorage.multiSet([[INGREDIENT_INDEX_KEY, JSON.stringify(filtered)]]);
  } catch (e) {
    console.error("Failed to delete ingredient", e);
  }
}
