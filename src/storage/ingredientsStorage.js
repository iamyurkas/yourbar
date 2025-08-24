import AsyncStorage from "@react-native-async-storage/async-storage";
import { InteractionManager } from "react-native";

// legacy key used by earlier versions that stored the whole array
const INGREDIENTS_KEY = "ingredients";
// new scheme: store ids separately and each ingredient under its own key
const INGREDIENT_IDS_KEY = "ingredient:ids";
const INGREDIENT_PREFIX = "ingredient:";

async function readIdIndex() {
  const json = await AsyncStorage.getItem(INGREDIENT_IDS_KEY);
  return json ? JSON.parse(json) : [];
}

async function writeIdIndex(ids) {
  await AsyncStorage.setItem(INGREDIENT_IDS_KEY, JSON.stringify(ids));
}

export async function getAllIngredients() {
  const ids = await readIdIndex();
  if (ids.length > 0) {
    const keys = ids.map((id) => `${INGREDIENT_PREFIX}${id}`);
    const entries = await AsyncStorage.multiGet(keys);
    return entries.map(([, json]) => JSON.parse(json));
  }

  // fallback for legacy data stored as a single array
  const json = await AsyncStorage.getItem(INGREDIENTS_KEY);
  const list = json ? JSON.parse(json) : [];
  if (list.length) {
    // migrate to the new layout
    await saveAllIngredients(list);
    await AsyncStorage.removeItem(INGREDIENTS_KEY);
  }
  return list;
}

export function buildIndex(list) {
  return list.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});
}

export async function saveAllIngredients(ingredients) {
  const entries = ingredients.map((ing) => [
    `${INGREDIENT_PREFIX}${ing.id}`,
    JSON.stringify(ing),
  ]);
  const ids = ingredients.map((i) => i.id);
  await AsyncStorage.multiSet(entries);
  await writeIdIndex(ids);
}

export function updateIngredientById(list, updated) {
  const index = list.findIndex((i) => i.id === updated.id);
  if (index === -1) return list;
  const next = [...list];
  next[index] = { ...next[index], ...updated };
  return next;
}

export async function saveIngredientById(id, ingredient) {
  const ids = await readIdIndex();
  if (!ids.includes(id)) {
    ids.push(id);
    await writeIdIndex(ids);
  }
  await AsyncStorage.setItem(
    `${INGREDIENT_PREFIX}${id}`,
    JSON.stringify(ingredient)
  );
}

export async function removeIngredientById(id) {
  const ids = await readIdIndex();
  const nextIds = ids.filter((i) => i !== id);
  await writeIdIndex(nextIds);
  await AsyncStorage.removeItem(`${INGREDIENT_PREFIX}${id}`);
}

// simple write queue so heavy JSON work runs after UI interactions
let writeQueue = Promise.resolve();
export function queueIngredientSave(id, ingredient) {
  writeQueue = writeQueue.then(
    () =>
      new Promise((resolve) =>
        InteractionManager.runAfterInteractions(async () => {
          await saveIngredientById(id, ingredient);
          resolve();
        })
      )
  );
  return writeQueue;
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
