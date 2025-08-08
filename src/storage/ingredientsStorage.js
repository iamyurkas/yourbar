import AsyncStorage from "@react-native-async-storage/async-storage";

const INGREDIENTS_KEY = "ingredients";

export async function getAllIngredients() {
  const json = await AsyncStorage.getItem(INGREDIENTS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveAllIngredients(ingredients) {
  await AsyncStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ingredients));
}

export async function saveIngredient(updatedIngredient) {
  const all = await getAllIngredients();
  const index = all.findIndex((i) => i.id === updatedIngredient.id);

  if (index !== -1) {
    all[index] = {
      ...all[index],
      ...updatedIngredient, // зберігає всі поля, включно з baseIngredientId
    };
    await saveAllIngredients(all);
  } else {
    console.warn("Ingredient not found:", updatedIngredient.id);
  }
}

export async function addIngredient(ingredient) {
  const current = await getAllIngredients();
  const newList = [
    ...current,
    {
      ...ingredient,
      inBar: false,
      inShoppingList: false,
      baseIngredientId: ingredient.baseIngredientId || null,
    },
  ];
  await saveAllIngredients(newList);
  return ingredient.id;
}

export async function getIngredientById(id) {
  const all = await getAllIngredients();
  return all.find((i) => i.id === id);
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
