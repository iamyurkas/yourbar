let cache = new Map();
let ingredientsMap = new Map();
let cocktailMap = new Map();
let usage = {};
let settings = { ignoreGarnish: false, allowSubstitutes: false };

function getAllowFlags(row, ingredient) {
  const allowBase =
    settings.allowSubstitutes || row.allowBaseSubstitution || row.allowBaseSubstitute;
  const allowBranded =
    settings.allowSubstitutes ||
    row.allowBrandedSubstitutes ||
    (ingredient?.baseIngredientId == null);
  const allowAnySubstitute =
    settings.allowSubstitutes ||
    row.allowBaseSubstitution ||
    row.allowBaseSubstitute ||
    row.allowBrandedSubstitutes;
  return { allowBase, allowBranded, allowAnySubstitute };
}

function resolveIngredient(candidate, row, flags) {
  if (!candidate) return null;
  const baseId = String(candidate.baseIngredientId ?? candidate.id);
  const base = ingredientsMap.get(baseId);
  if (candidate.inBar) return candidate;
  if (flags.allowBase && candidate.id !== Number(baseId) && base?.inBar) return base;
  if (flags.allowBranded) {
    const brand = findBrand(baseId);
    if (brand && brand.id !== candidate.id) return brand;
  }
  return null;
}

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
    const flags = getAllowFlags(r, ing);
    const allowAnySubstitute = flags.allowAnySubstitute;
    let used = resolveIngredient(ing, r, flags);
    if (!used && allowAnySubstitute && Array.isArray(r.substitutes)) {
      for (const s of r.substitutes) {
        const candidate = ingredientsMap.get(String(s.id));
        used = resolveIngredient(candidate, r, flags);
        if (used) break;
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
