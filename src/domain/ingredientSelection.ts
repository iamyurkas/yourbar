import { normalizeSearch } from "../utils/normalizeSearch";

// Build lookup maps for ingredients list
export function buildIngredientIndexes(ingredients) {
  const byId = new Map();
  const byBase = new Map();
  const bySearch = new Map(); // normalized name -> ingredient (only if unique)
  for (const ing of ingredients || []) {
    byId.set(ing.id, ing);
    const base = ing.baseIngredientId ?? ing.id;
    const arr = byBase.get(base);
    if (arr) arr.push(ing);
    else byBase.set(base, [ ing ]);
    const key = ing.searchName || normalizeSearch(ing.name || "");
    if (key) {
      if (!bySearch.has(key)) bySearch.set(key, ing);
      else bySearch.set(key, null); // not unique
    }
  }
  const findBrand = (baseId) => {
    const list = byBase.get(baseId) || [];
    // pick first branded in stock
    return list.find((i) => i.inBar && i.baseIngredientId === baseId) || null;
  };
  return { byId, byBase, bySearch, findBrand };
}

function isIngredientAvailable(ingredientId, indexes, opts) {
  const { byId, findBrand } = indexes || {};
  const { allowSubstitutes = false, allowBaseSubstitution = false, allowBrandedSubstitutes = false } = opts || {};
  const ing = ingredientId ? byId?.get(ingredientId) : null;
  if (!ing) return null;
  if (ing.inBar) return ing;
  const baseId = ing.baseIngredientId ?? ingredientId;
  const isBaseIngredient = ing.baseIngredientId == null;
  if (allowSubstitutes || allowBaseSubstitution) {
    const base = byId?.get(baseId);
    if (base?.inBar) return base;
  }
  if (allowSubstitutes || allowBrandedSubstitutes || isBaseIngredient) {
    const brand = findBrand ? findBrand(baseId) : null;
    if (brand) return brand;
  }
  return null;
}

// Select which ingredient to use for a recipe row, mirroring AllCocktails logic.
export function chooseUsedIngredient(recipeRow, indexes, opts = {}) {
  const { byId, byBase, bySearch, findBrand } = indexes || {};
  const { allowSubstitutes = false } = opts || {};
  const r = recipeRow || {};
  let ing = r.ingredientId ? byId?.get(r.ingredientId) : null;
  // Fallback: resolve by normalized name if id is missing
  if (!ing && r.name && bySearch) {
    const key = normalizeSearch(r.name || "");
    const candidate = bySearch.get(key);
    if (candidate) ing = candidate;
  }
  const baseId = ing?.baseIngredientId ?? r.ingredientId;
  const allowBaseSubstitution = !!(r.allowBaseSubstitution ?? r.allowBaseSubstitute);
  const allowBrandedSubstitutes = !!r.allowBrandedSubstitutes;
  let used = null;
  if (ing) {
    used = isIngredientAvailable(ing.id, indexes, {
      allowSubstitutes,
      allowBaseSubstitution,
      allowBrandedSubstitutes,
    });
    if (!used && Array.isArray(r.substitutes)) {
      for (const s of r.substitutes) {
        used = isIngredientAvailable(s.id, indexes, {
          allowSubstitutes,
          allowBaseSubstitution,
          allowBrandedSubstitutes,
        });
        if (used) break;
      }
    }
  }
  return { used, ing, baseId };
}
