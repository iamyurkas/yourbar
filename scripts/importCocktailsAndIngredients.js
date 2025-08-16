import AsyncStorage from "@react-native-async-storage/async-storage";
import RAW_DATA from "../assets/data/open-cocktails.json";
import { BUILTIN_INGREDIENT_TAGS } from "../src/constants/ingredientTags";
import { BUILTIN_COCKTAIL_TAGS } from "../src/constants/cocktailTags";
import { replaceAllCocktails } from "../src/storage/cocktailsStorage";

const INGREDIENTS_KEY = "ingredients";
const COCKTAILS_KEY = "cocktails_v1";
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

function sanitizeIngredients(raw) {
  return Array.isArray(raw)
    ? raw.map((it) => ({
        id: String(it?.id ?? ""),
        name: String(it?.name ?? "").trim(),
        description: String(it?.description ?? "").trim(),
        photoUri: it?.photoUri
          ? String(it.photoUri)
          : it?.image
          ? String(it.image)
          : null,
        tags: mapTags(it?.tags, ING_TAG_BY_ID),
        baseIngredientId: it?.baseIngredientId ?? null,
        usageCount: Number(it?.usageCount ?? 0),
        singleCocktailName: it?.singleCocktailName ?? null,
        inBar: !!it?.inBar,
      }))
    : [];
}

function sanitizeCocktails(raw) {
  return Array.isArray(raw)
    ? raw.map((c) => ({
        ...c,
        photoUri: c?.photoUri
          ? String(c.photoUri)
          : c?.image
          ? String(c.image)
          : null,
        tags: mapTags(c?.tags, COCKTAIL_TAG_BY_ID),
        ingredients: Array.isArray(c?.ingredients) ? c.ingredients : [],
      }))
    : [];
}

export async function importCocktailsAndIngredients({ force = false } = {}) {
  try {
    if (!force) {
      const already = await AsyncStorage.getItem(IMPORT_FLAG_KEY);
      if (already === "true") {
        console.log("ℹ️ Sample data already imported — skip");
        return;
      }
    }

    if (!force) {
      const [existingIngredients, existingCocktails] = await Promise.all([
        AsyncStorage.getItem(INGREDIENTS_KEY),
        AsyncStorage.getItem(COCKTAILS_KEY),
      ]);
      if (existingIngredients && existingCocktails) {
        console.log("ℹ️ Data present — skip import");
        await AsyncStorage.setItem(IMPORT_FLAG_KEY, "true");
        return;
      }
    }

    const ingredients = sanitizeIngredients(RAW_DATA.ingredients);
    const cocktails = sanitizeCocktails(RAW_DATA.cocktails);

    await AsyncStorage.setItem(INGREDIENTS_KEY, JSON.stringify(ingredients));
    await replaceAllCocktails(cocktails);
    await AsyncStorage.setItem(IMPORT_FLAG_KEY, "true");

    console.log(
      `✅ Imported ${ingredients.length} ingredients and ${cocktails.length} cocktails`
    );
  } catch (error) {
    console.error("❌ Error importing data:", error);
  }
}
