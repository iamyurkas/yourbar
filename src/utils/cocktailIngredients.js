export function buildIngredientIndex(ingredients = []) {
  const ingMap = new Map((ingredients || []).map((i) => [String(i.id), i]));
  const findBrand = (baseId) =>
    ingredients.find(
      (i) => i.inBar && String(i.baseIngredientId) === String(baseId)
    );
  return { ingMap, findBrand };
}

export function getCocktailIngredientInfo(
  cocktail,
  { ingMap, findBrand, allowSubstitutes = false, ignoreGarnish = false } = {}
) {
  const required = (cocktail.ingredients || []).filter(
    (r) => !r.optional && !(ignoreGarnish && r.garnish)
  );
  const missingNames = [];
  const missingIds = [];
  const ingredientNames = [];
  let allAvail = required.length > 0;
  let branded = false;
  for (const r of required) {
    const ing = ingMap.get(String(r.ingredientId));
    const baseId = String(ing?.baseIngredientId ?? r.ingredientId);
    let used = null;
    if (ing?.inBar) {
      used = ing;
    } else {
      if (allowSubstitutes || r.allowBaseSubstitution) {
        const base = ingMap.get(baseId);
        if (base?.inBar) used = base;
      }
      const isBaseIngredient = ing?.baseIngredientId == null;
      if (
        !used &&
        (allowSubstitutes || r.allowBrandedSubstitutes || isBaseIngredient)
      ) {
        const brand = findBrand ? findBrand(baseId) : null;
        if (brand) used = brand;
      }
      if (!used && Array.isArray(r.substitutes)) {
        for (const s of r.substitutes) {
          const candidate = ingMap.get(String(s.id));
          if (candidate?.inBar) {
            used = candidate;
            break;
          }
        }
      }
    }
    if (used) {
      ingredientNames.push(used.name);
      if (used.baseIngredientId != null) branded = true;
    } else {
      if (ing?.baseIngredientId != null) branded = true;
      const missingName = ing?.name || r.name || "";
      if (missingName) missingNames.push(missingName);
      missingIds.push(baseId);
      allAvail = false;
    }
  }
  let ingredientLine = ingredientNames.join(", ");
  if (!allAvail) {
    if (missingNames.length > 0 && missingNames.length <= 2) {
      ingredientLine = `Missing: ${missingNames.join(", ")}`;
    } else if (missingNames.length >= 3 || missingNames.length === 0) {
      ingredientLine = `Missing: ${missingNames.length || required.length} ingredients`;
    }
  }
  return {
    ingredientLine,
    isAllAvailable: allAvail,
    hasBranded: branded,
    missingIngredientIds: missingIds,
  };
}
