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
  const allowBase = allowSubstitutes || r.allowBaseSubstitution || r.allowBaseSubstitute;
  const isBaseIngredient = ing?.baseIngredientId == null;
  const allowBranded = allowSubstitutes || r.allowBrandedSubstitutes || isBaseIngredient;
  const allowAnySubstitute =
    allowSubstitutes ||
    r.allowBaseSubstitution ||
    r.allowBaseSubstitute ||
    r.allowBrandedSubstitutes;
  let used = null;
  if (ing?.inBar) {
    used = ing;
  } else if (ing) {
    if (allowBase) {
      const base = byId?.get(baseId);
      if (base?.inBar && base.id !== ing.id) used = base;
    }
    if (!used && allowBranded) {
      const brand = findBrand
        ? findBrand(baseId)
        : (byBase?.get(baseId) || []).find((i) => i.inBar);
      if (brand && brand.id !== ing.id) used = brand;
    }
    if (!used && allowAnySubstitute && Array.isArray(r.substitutes)) {
      for (const s of r.substitutes) {
        const candidate = byId?.get(s.id);
        if (!candidate) continue;
        if (candidate.inBar) {
          used = candidate;
          break;
        }
        const candidateBaseId = candidate.baseIngredientId ?? candidate.id;
        if (allowBase && candidate.id !== candidateBaseId) {
          const base = byId?.get(candidateBaseId);
          if (base?.inBar) {
            used = base;
            break;
          }
        }
        if (allowBranded) {
          const brand = findBrand
            ? findBrand(candidateBaseId)
            : (byBase?.get(candidateBaseId) || []).find((i) => i.inBar);
          if (brand && brand.id !== candidate.id) {
            used = brand;
            break;
          }
        }
      }
    }
  }
  return { used, ing, baseId };
}
