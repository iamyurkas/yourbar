import AsyncStorage from "@react-native-async-storage/async-storage";
import RAW_COCKTAILS from "../assets/data/cocktails.json";
import RAW_INGREDIENTS from "../assets/data/ingredients.json";
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

function toIngredientTags(tagIds) {
  if (!Array.isArray(tagIds) || tagIds.length === 0) return [];
  const first = tagIds[0];
  const tagObj = ING_TAG_BY_ID[first];
  return tagObj ? [tagObj] : [];
}

function normalizeIngredients(raw) {
  const now = Date.now();
  return raw.map((it, idx) => ({
    id: `${now}-${idx}`,
    name: String(it?.name ?? "").trim(),
    description: String(it?.description ?? "").trim(),
    photoUri: it?.photoUri
      ? String(it.photoUri)
      : it?.image
      ? String(it.image)
      : null,
    tags: toIngredientTags(it?.tags),
    baseIngredientId: null,
  }));
}

function toCocktailTags(tagIds) {
  if (!Array.isArray(tagIds)) return [];
  return tagIds
    .map((id) => COCKTAIL_TAG_BY_ID[id])
    .filter(Boolean);
}

function normalizeCocktails(raw, ingNameToId) {
  const now = Date.now();
  return raw.map((c, idx) => ({
    id: now + idx,
    name: String(c?.name ?? "").trim(),
    photoUri: c?.photoUri
      ? String(c.photoUri)
      : c?.image
      ? String(c.image)
      : null,
    glassId: c?.glassware ? String(c.glassware) : null,
    description: String(c?.description ?? "").trim(),
    instructions: Array.isArray(c?.instructions)
      ? c.instructions.join("\n")
      : String(c?.instructions ?? ""),
    tags: toCocktailTags(c?.tags),
    ingredients: Array.isArray(c?.ingredients)
      ? c.ingredients.map((r, i) => ({
          order: i + 1,
          ingredientId:
            ingNameToId.get(String(r.ingredient).toLowerCase()) ?? null,
          name: String(r.ingredient ?? "").trim(),
          amount: String(r.quantity ?? "").trim(),
          unitId: Number(r.unit ?? 11),
          garnish: !!r.garnish,
          optional: !!r.optional,
          allowBaseSubstitution: false,
          allowBrandedSubstitutes: false,
          substitutes: [],
        }))
      : [],
  }));
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

    const ingredients = normalizeIngredients(RAW_INGREDIENTS);
    const ingMap = new Map(
      ingredients.map((i) => [i.name.toLowerCase(), i.id])
    );
    const cocktails = normalizeCocktails(RAW_COCKTAILS, ingMap);

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
