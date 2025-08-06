import AsyncStorage from "@react-native-async-storage/async-storage";

const INGREDIENTS_KEY = "ingredients";

export async function getAllIngredients() {
  const json = await AsyncStorage.getItem(INGREDIENTS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveAllIngredients(ingredients) {
  await AsyncStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ingredients));
}

export async function addIngredient(ingredient) {
  const current = await getAllIngredients();
  const newList = [...current, ingredient];
  await saveAllIngredients(newList);
  return ingredient.id;
}

export async function getIngredientById(id) {
  const all = await getAllIngredients();
  return all.find((i) => i.id === id);
}
