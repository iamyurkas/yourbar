let cache = new Map();
let ingredientsMap = new Map();
let cocktailMap = new Map();
let cocktailAvailability = new Map();
let brandByBaseId = new Map();
let usage = {};
let settings = { ignoreGarnish: false, allowSubstitutes: false };

function rebuildIngredientLookups(ingredients = []) {
  const list = Array.isArray(ingredients) ? ingredients : [];
  ingredientsMap = new Map(list.map((i) => [String(i.id), i]));
  brandByBaseId = new Map();
  for (const ing of list) {
    if (!ing?.inBar) continue;
    const baseId = ing.baseIngredientId;
    if (baseId == null) continue;
    const key = String(baseId);
    if (!brandByBaseId.has(key)) {
      brandByBaseId.set(key, ing);
    }
  }
}

function findBrand(baseId) {
  return brandByBaseId.get(String(baseId)) ?? null;
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
    if (!cocktail) return;
    let available;
    if (cocktailAvailability.has(cid)) {
      available = cocktailAvailability.get(cid);
    } else {
      available = isCocktailAvailable(cocktail);
      cocktailAvailability.set(cid, available);
    }
    if (available) {
      count++;
      singleName = cocktail.name;
    }
  });
  return { count, single: count === 1 ? singleName : null };
}

export function initIngredientsAvailability(ingredients, cocktails, usageMap, ignoreGarnish, allowSubstitutes) {
  rebuildIngredientLookups(ingredients);
  cocktailMap = new Map(cocktails.map((c) => [c.id, c]));
  usage = usageMap || {};
  settings = { ignoreGarnish: !!ignoreGarnish, allowSubstitutes: !!allowSubstitutes };
  cache = new Map();
  cocktailAvailability = new Map();
  cocktails.forEach((cocktail) => {
    cocktailAvailability.set(cocktail.id, isCocktailAvailable(cocktail));
  });
  ingredients.forEach((ing) => {
    cache.set(ing.id, computeForIngredient(ing.id));
  });
  return cache;
}

export function updateIngredientAvailability(changedIds, ingredients) {
  rebuildIngredientLookups(ingredients);
  const list = Array.isArray(changedIds) ? changedIds : [changedIds];
  const affected = new Set(list);
  const affectedCocktails = new Set();
  list.forEach((changedId) => {
    const relatedCocktails = usage[changedId] || [];
    relatedCocktails.forEach((cid) => {
      affectedCocktails.add(cid);
      const cocktail = cocktailMap.get(cid);
      (cocktail?.ingredients || []).forEach((r) => affected.add(r.ingredientId));
    });
  });
  affectedCocktails.forEach((cid) => {
    const cocktail = cocktailMap.get(cid);
    if (!cocktail) return;
    cocktailAvailability.set(cid, isCocktailAvailable(cocktail));
  });
  affected.forEach((id) => {
    cache.set(id, computeForIngredient(id));
  });
  return cache;
}

export function getIngredientsAvailability() {
  return cache;
}
