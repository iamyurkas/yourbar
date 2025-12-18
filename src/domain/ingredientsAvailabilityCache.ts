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

function isIngredientAvailable(id, { allowBaseSubstitution, allowBrandedSubstitutes }) {
  const ing = ingredientsMap.get(String(id));
  if (!ing) return false;
  if (ing.inBar) return true;
  const baseId = String(ing.baseIngredientId ?? ing.id ?? id);
  const isBaseIngredient = ing.baseIngredientId == null;
  if (settings.allowSubstitutes || allowBaseSubstitution) {
    const base = ingredientsMap.get(baseId);
    if (base?.inBar) return true;
  }
  if (
    settings.allowSubstitutes ||
    allowBrandedSubstitutes ||
    isBaseIngredient
  ) {
    const brand = findBrand(baseId);
    if (brand) return true;
  }
  return false;
}

function isCocktailAvailable(cocktail) {
  const required = (cocktail.ingredients || []).filter(
    (r) => !r.optional && !(settings.ignoreGarnish && r.garnish)
  );
  if (required.length === 0) return false;
  for (const r of required) {
    const allowBaseSubstitution = !!(
      r.allowBaseSubstitution ?? r.allowBaseSubstitute
    );
    const allowBrandedSubstitutes = !!r.allowBrandedSubstitutes;
    const opts = { allowBaseSubstitution, allowBrandedSubstitutes };
    if (isIngredientAvailable(r.ingredientId, opts)) continue;
    if (
      !Array.isArray(r.substitutes) ||
      !r.substitutes.some((s) => isIngredientAvailable(s.id, opts))
    ) {
      return false;
    }
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

export function updateIngredientAvailability(changedIds, ingredients) {
  ingredientsMap = new Map(ingredients.map((i) => [String(i.id), i]));
  const list = Array.isArray(changedIds) ? changedIds : [changedIds];
  const affected = new Set(list);
  list.forEach((changedId) => {
    const relatedCocktails = usage[changedId] || [];
    relatedCocktails.forEach((cid) => {
      const cocktail = cocktailMap.get(cid);
      (cocktail?.ingredients || []).forEach((r) => affected.add(r.ingredientId));
    });
  });
  affected.forEach((id) => {
    cache.set(id, computeForIngredient(id));
  });
  return cache;
}

export function getIngredientsAvailability() {
  return cache;
}
