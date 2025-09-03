import AsyncStorage from "@react-native-async-storage/async-storage";
import RAW_DATA from "../assets/data/data.json";
import { BUILTIN_INGREDIENT_TAGS } from "../src/constants/ingredientTags";
import { BUILTIN_COCKTAIL_TAGS } from "../src/constants/cocktailTags";
import {
  replaceAllCocktailsTx,
  getAllCocktailsTx,
} from "../src/storage/cocktailsStorage";
import {
  getAllIngredientsTx,
  saveAllIngredientsTx,
} from "../src/storage/ingredientsStorage";
import { initDatabase, withExclusiveWriteAsync } from "../src/storage/sqlite";
import { normalizeSearch } from "../src/utils/normalizeSearch";
import { WORD_SPLIT_RE } from "../src/utils/wordPrefixMatch";
import { Image } from "react-native";
import { ASSET_MAP } from "./assetMap";
import { startImport, finishImport } from "../src/storage/importLock";

const IMPORT_FLAG_KEY = "default_data_imported_flag";

// Maps for quick tag lookup
const ING_TAG_BY_ID = Object.fromEntries(
  BUILTIN_INGREDIENT_TAGS.map((t) => [t.id, t])
);
const COCKTAIL_TAG_BY_ID = Object.fromEntries(
  BUILTIN_COCKTAIL_TAGS.map((t) => [t.id, t])
);

function mapTags(tags, map) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => (typeof t === "number" ? map[t] : t))
    .filter(Boolean);
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

function sanitizeIngredients(raw) {
  return Array.isArray(raw)
    ? raw.map((it) => {
        const name = String(it?.name ?? "").trim();
        const searchName =
          it?.searchName ?? normalizeSearch(name);
        const searchTokens = Array.isArray(it?.searchTokens)
          ? it.searchTokens
          : searchName.split(WORD_SPLIT_RE).filter(Boolean);
        return {
          id: toNumberId(it?.id) ?? 0,
          name,
          description: String(it?.description ?? "").trim(),
          photoUri: resolvePhoto(it?.photoUri || it?.image),
          tags: mapTags(it?.tags, ING_TAG_BY_ID),
          baseIngredientId:
            it?.baseIngredientId != null
              ? toNumberId(it.baseIngredientId)
              : null,
          usageCount: Number(it?.usageCount ?? 0),
          singleCocktailName: it?.singleCocktailName ?? null,
          inBar: false,
          inShoppingList: false,
          searchName,
          searchTokens,
        };
      })
    : [];
}

function sanitizeCocktails(raw) {
  return Array.isArray(raw)
    ? raw.map((c) => ({
        ...c,
        id: toNumberId(c?.id) ?? 0,
        rating: 0,
        photoUri: resolvePhoto(c?.photoUri || c?.image),
        tags: mapTags(c?.tags, COCKTAIL_TAG_BY_ID),
        ingredients: Array.isArray(c?.ingredients)
          ? c.ingredients.map((ing) => ({
              ...ing,
              ingredientId:
                ing?.ingredientId != null
                  ? toNumberId(ing.ingredientId)
                  : null,
              substitutes: Array.isArray(ing?.substitutes)
                ? ing.substitutes.map((s) => ({
                    ...s,
                    id: toNumberId(s?.id),
                  }))
                : [],
            }))
          : [],
      }))
    : [];
}

export async function importCocktailsAndIngredients({ force = false } = {}) {
  startImport();
  try {
    await initDatabase();
    const already = force
      ? null
      : await AsyncStorage.getItem(IMPORT_FLAG_KEY);
    let counts = null;
    await withExclusiveWriteAsync(async (tx) => {
      const existingIngredients = await getAllIngredientsTx(tx);
      const existingCocktails = await getAllCocktailsTx(tx);

      if (
        !force &&
        already === "true" &&
        existingIngredients.length > 0 &&
        existingCocktails.length > 0
      ) {
        console.log("ℹ️ Sample data already imported — skip");
        return;
      }

      const existingIngredientsMap = Object.fromEntries(
        existingIngredients.map((it) => [it.id, it])
      );
      const existingCocktailsMap = Object.fromEntries(
        existingCocktails.map((c) => [c.id, c])
      );

      const ingredients = sanitizeIngredients(RAW_DATA.ingredients).map((it) => {
        const existing = existingIngredientsMap[it.id];
        if (existing) {
          return {
            ...it,
            inBar: existing.inBar,
            inShoppingList: existing.inShoppingList,
          };
        }
        return it;
      });

      const cocktails = sanitizeCocktails(RAW_DATA.cocktails).map((c) => {
        const existing = existingCocktailsMap[c.id];
        if (existing) {
          return {
            ...c,
            rating: existing.rating,
          };
        }
        return c;
      });

      await saveAllIngredientsTx(tx, ingredients);
      await replaceAllCocktailsTx(tx, cocktails);
      counts = { ingredients: ingredients.length, cocktails: cocktails.length };
    });
    if (counts) {
      await AsyncStorage.setItem(IMPORT_FLAG_KEY, "true");
      console.log(
        `✅ Imported ${counts.ingredients} ingredients and ${counts.cocktails} cocktails`
      );
    }
  } catch (error) {
    console.error("❌ Error importing data:", error);
  } finally {
    finishImport();
  }
}
