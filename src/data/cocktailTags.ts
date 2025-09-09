// src/storage/cocktailTagsStorage.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BUILTIN_COCKTAIL_TAGS } from "../constants/cocktailTags";

const STORAGE_KEY = "cocktail_tags_custom_v1";

// прочитати кастомні
export async function getCustomCocktailTags() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// повертає вшиті + кастомні (кастом може перекривати за id)
export async function getAllCocktailTags() {
  const custom = await getCustomCocktailTags();
  const map = new Map(BUILTIN_COCKTAIL_TAGS.map((t) => [t.id, t]));
  for (const t of custom) map.set(t.id, t);
  return Array.from(map.values());
}

// додати/оновити кастомний тег
export async function upsertCocktailTag(tag) {
  if (!tag || typeof tag !== "object") return;
  const custom = await getCustomCocktailTags();
  const idx = custom.findIndex((t) => t.id === tag.id);
  if (idx >= 0) custom[idx] = tag;
  else {
    // якщо id не заданий — створимо
    if (tag.id == null) tag.id = Date.now();
    custom.push(tag);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  return tag;
}

// видалити кастомний тег
export async function deleteCocktailTag(id) {
  const custom = await getCustomCocktailTags();
  const next = custom.filter((t) => t.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
