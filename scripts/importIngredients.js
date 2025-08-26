// scripts/importIngredients.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import RAW_INGREDIENTS from "../assets/data/ingredients.json";
import { BUILTIN_INGREDIENT_TAGS } from "../src/constants/ingredientTags";
import { Image } from "react-native";
import { ASSET_MAP } from "./assetMap";
import {
  getAllIngredients,
  saveAllIngredients,
} from "../src/storage/ingredientsStorage";

const IMPORT_FLAG_KEY = "ingredients_imported_flag";

// Індекс тегів по id для швидкого мепінгу
const TAG_BY_ID = Object.fromEntries(
  BUILTIN_INGREDIENT_TAGS.map((t) => [t.id, t])
);

// З твого JSON беремо тільки ПЕРШИЙ (найвідповідніший) тег-ід і перетворюємо на об'єкт
function toTagObjects(tagIds) {
  if (!Array.isArray(tagIds) || tagIds.length === 0) return [];
  const first = tagIds[0];
  const tagObj = TAG_BY_ID[first];
  return tagObj ? [tagObj] : [];
}

function resolvePhoto(path) {
  if (!path) return null;
  const str = String(path);
  if (/^(https?:|file:)/.test(str)) return str;
  const mod = ASSET_MAP[str];
  if (mod) {
    const resolved = Image.resolveAssetSource(mod);
    return resolved?.uri ?? null;
  }
  console.warn("Missing asset", str);
  return null;
}

function toNumberId(value) {
  if (value == null) return null;
  const direct = Number(value);
  if (!Number.isNaN(direct)) return direct;
  const str = String(value);
  const parts = str.split("-");
  const last = parts[parts.length - 1];
  const num = Number(last);
  return Number.isNaN(num) ? null : num;
}

function normalize(raw) {
  const now = Date.now();
  return raw.map((it, idx) => ({
    id: now + idx, // стабільний числовий id у межах імпорту
    name: String(it?.name ?? "").trim(),
    description: String(it?.description ?? "").trim(), // дефолт
    photoUri: resolvePhoto(it?.photoUri || it?.image),
    tags: toTagObjects(it?.tags), // масив ОБ'ЄКТІВ тегів
    baseIngredientId:
      it?.baseIngredientId != null ? toNumberId(it.baseIngredientId) : null,
  }));
}

export async function importIngredients({ force = false } = {}) {
  try {
    // щоб не перезаливати на кожному старті
    if (!force) {
      const already = await AsyncStorage.getItem(IMPORT_FLAG_KEY);
      if (already === "true") {
        console.log("ℹ️ Ingredients already imported — skip");
        return;
      }
    }

    // якщо раптом уже є масив інгредієнтів — не перетираємо (якщо не force)
    if (!force) {
      const existing = await getAllIngredients();
      if (existing.length > 0) {
        console.log("ℹ️ Ingredients present — skip import");
        await AsyncStorage.setItem(IMPORT_FLAG_KEY, "true");
        return;
      }
    }

    const normalized = normalize(RAW_INGREDIENTS);
    await saveAllIngredients(normalized);
    await AsyncStorage.setItem(IMPORT_FLAG_KEY, "true");

    console.log(`✅ Ingredients imported: ${normalized.length}`);
  } catch (error) {
    console.error("❌ Error importing ingredients:", error);
  }
}
