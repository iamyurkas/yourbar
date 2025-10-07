import { registerDerivedUpdater } from "../data/derived";

let cache = new Map();
let ingredientsMap = new Map();
let cocktailMap = new Map();
let usage = {};
let settings = { ignoreGarnish: false, allowSubstitutes: false };

function findBrand(baseId) {
  for (const ing of ingredientsMap.values()) {
    if (ing.inBar && String(ing.baseIngredientId) === String(baseId)) return ing;
  }
  return null;
}

function isCocktailAvailable(cocktail) {
  const required = (cocktail.ingredients || []).filter(
    (r) => !r.optional && !(settings.ignoreGarnish && r.garnish)
  );
  if (required.length === 0) return false;
  for (const r of required) {
    const ing = ingredientsMap.get(String(r.ingredientId));
    const baseId = String(ing?.baseIngredientId ?? r.ingredientId);
    let used = null;
    if (ing?.inBar) used = ing;
    else {
      if (settings.allowSubstitutes || r.allowBaseSubstitution) {
        const base = ingredientsMap.get(baseId);
        if (base?.inBar) used = base;
      }
      if (
        !used &&
        (settings.allowSubstitutes || r.allowBrandedSubstitutes || ing?.baseIngredientId != null)
      ) {
        const brand = findBrand(baseId);
        if (brand) used = brand;
      }
      if (!used && Array.isArray(r.substitutes)) {
        for (const s of r.substitutes) {
          const cand = ingredientsMap.get(String(s.id));
          if (cand?.inBar) {
            used = cand;
            break;
          }
        }
      }
    }
    if (!used) return false;
  }
  return true;
}

function computeForIngredient(id) {
  const ids = usage[id] || [];
  let count = 0;
  let singleName = null;
  ids.forEach((cid) => {
    const cocktail = cocktailMap.get(cid);
    if (cocktail && isCocktailAvailable(cocktail)) {
      count++;
      singleName = cocktail.name;
    }
  });
  return { count, single: count === 1 ? singleName : null };
}

function updateAvailabilityForIds(ids) {
  const list = Array.isArray(ids) ? ids.map(String) : [String(ids)];
  const affected = new Set(list);
  list.forEach((changedId) => {
    const relatedCocktails = usage[changedId] || [];
    relatedCocktails.forEach((cid) => {
      const cocktail = cocktailMap.get(cid);
      (cocktail?.ingredients || []).forEach((r) => affected.add(String(r.ingredientId)));
    });
  });
  affected.forEach((id) => {
    cache.set(id, computeForIngredient(id));
  });
  return cache;
}

registerDerivedUpdater((id, flags) => {
  const key = String(id);
  const existing = ingredientsMap.get(key);
  if (existing) {
    ingredientsMap.set(key, { ...existing, inBar: flags.inBar });
  }
  updateAvailabilityForIds([key]);
  return undefined;
});

export function initIngredientsAvailability(ingredients, cocktails, usageMap, ignoreGarnish, allowSubstitutes) {
  ingredientsMap = new Map(ingredients.map((i) => [String(i.id), i]));
  cocktailMap = new Map(cocktails.map((c) => [c.id, c]));
  usage = usageMap || {};
  settings = { ignoreGarnish: !!ignoreGarnish, allowSubstitutes: !!allowSubstitutes };
  cache = new Map();
  ingredients.forEach((ing) => {
    cache.set(ing.id, computeForIngredient(ing.id));
  });
  return cache;
}

export function updateIngredientAvailability(changedIds) {
  return updateAvailabilityForIds(changedIds);
}

export function getIngredientsAvailability() {
  return cache;
}
