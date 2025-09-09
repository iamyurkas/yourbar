function buildByBase(ingredients) {
  const map = new Map();
  ingredients.forEach((i) => {
    const baseId = i.baseIngredientId ?? i.id;
    if (!map.has(baseId)) map.set(baseId, []);
    map.get(baseId).push(i);
  });
  return map;
}

export function mapCocktailsByIngredient(ingredients, cocktails, options = {}) {
  const { allowSubstitutes = false, byId, byBase } = options;
  const byIdMap = byId || new Map(ingredients.map((i) => [i.id, i]));
  const byBaseMap = byBase || buildByBase(ingredients);

  const usageMap = new Map();
  const add = (id, cocktailId) => {
    if (id == null) return;
    let set = usageMap.get(id);
    if (!set) {
      set = new Set();
      usageMap.set(id, set);
    }
    set.add(cocktailId);
  };

  cocktails.forEach((c) => {
    if (!Array.isArray(c.ingredients)) return;
    c.ingredients.forEach((r) => {
      if (r.ingredientId == null) return;
      const ing = byIdMap.get(r.ingredientId);
      if (!ing) return;
      const baseId = ing.baseIngredientId ?? ing.id;
      const group = byBaseMap.get(baseId) || [];

      // direct usage
      add(ing.id, c.id);

      if (ing.id === baseId) {
        // base ingredient used: count all branded versions
        group.forEach((item) => {
          if (item.id !== baseId) add(item.id, c.id);
        });
      } else {
        // branded ingredient used: base ingredient always counts
        add(baseId, c.id);
        if (allowSubstitutes || r.allowBrandedSubstitutes) {
          group.forEach((item) => {
            if (item.id !== ing.id && item.id !== baseId) add(item.id, c.id);
          });
        }
      }

      // explicit substitutes
      if (Array.isArray(r.substitutes)) {
        r.substitutes.forEach((s) => add(s.id, c.id));
      }
    });
  });

  const result = {};
  ingredients.forEach((i) => {
    const set = usageMap.get(i.id);
    result[i.id] = set ? Array.from(set) : [];
  });
  return result;
}

export function calculateIngredientUsage(ingredients, cocktails, options = {}) {
  const map = mapCocktailsByIngredient(ingredients, cocktails, options);
  const result = {};
  ingredients.forEach((i) => {
    const arr = map[i.id];
    result[i.id] = Array.isArray(arr) ? arr.length : 0;
  });
  return result;
}

export function updateUsageMap(prevMap, ingredients, cocktails, options = {}) {
  const {
    changedIngredientIds = [],
    changedCocktailIds = [],
    prevCocktails = [],
    prevIngredients = [],
    allowSubstitutes = false,
    byId,
    byBase,
    prevById,
    prevByBase,
  } = options;
  let map = { ...prevMap };

  const prevCocktailsById = new Map(prevCocktails.map((c) => [c.id, c]));
  const nextCocktailsById = new Map(cocktails.map((c) => [c.id, c]));
  const prevIngs = prevIngredients.length > 0 ? prevIngredients : ingredients;
  const nextById = byId || new Map(ingredients.map((i) => [i.id, i]));
  const nextByBase = byBase || buildByBase(ingredients);
  const prevByIdMap = prevById || new Map(prevIngs.map((i) => [i.id, i]));
  const prevByBaseMap = prevByBase || buildByBase(prevIngs);

  // Handle changed cocktails (added/edited/removed)
  changedCocktailIds.forEach((id) => {
    const prevC = prevCocktailsById.get(id);
    if (prevC) {
      map = removeCocktailFromUsageMap(map, prevIngs, prevC, {
        allowSubstitutes,
        byId: prevByIdMap,
        byBase: prevByBaseMap,
      });
    } else {
      // Ensure removed id is not present
      for (const ingId of Object.keys(map)) {
        const arr = map[ingId];
        const idx = arr.indexOf(id);
        if (idx >= 0) {
          arr.splice(idx, 1);
          if (arr.length === 0) delete map[ingId];
        }
      }
    }
    const nextC = nextCocktailsById.get(id);
    if (nextC) {
      map = addCocktailToUsageMap(map, ingredients, nextC, {
        allowSubstitutes,
        byId: nextById,
        byBase: nextByBase,
      });
    }
  });

  // Handle changed ingredients
  if (changedIngredientIds.length > 0) {
    const changedSet = new Set(changedIngredientIds);
    const prevIngsById = prevByIdMap;
    const nextIngsById = nextById;
    const affectedCocktails = new Set();

    cocktails.forEach((cocktail) => {
      if (!Array.isArray(cocktail.ingredients)) return;
      for (const r of cocktail.ingredients) {
        const ingPrev = prevIngsById.get(r.ingredientId);
        const ingNext = nextIngsById.get(r.ingredientId);
        const basePrev = ingPrev?.baseIngredientId ?? ingPrev?.id;
        const baseNext = ingNext?.baseIngredientId ?? ingNext?.id;
        if (
          changedSet.has(r.ingredientId) ||
          changedSet.has(basePrev) ||
          changedSet.has(baseNext)
        ) {
          affectedCocktails.add(cocktail.id);
          break;
        }
        if (Array.isArray(r.substitutes)) {
          if (r.substitutes.some((s) => changedSet.has(s.id))) {
            affectedCocktails.add(cocktail.id);
            break;
          }
        }
      }
    });

    affectedCocktails.forEach((id) => {
      const prevC = prevCocktailsById.get(id) || nextCocktailsById.get(id);
      if (prevC) {
        map = removeCocktailFromUsageMap(map, prevIngs, prevC, {
          allowSubstitutes,
          byId: prevByIdMap,
          byBase: prevByBaseMap,
        });
      }
      const nextC = nextCocktailsById.get(id);
      if (nextC) {
        map = addCocktailToUsageMap(map, ingredients, nextC, {
          allowSubstitutes,
          byId: nextById,
          byBase: nextByBase,
        });
      }
    });
  }

  return map;
}

export function addCocktailToUsageMap(prevMap, ingredients, cocktail, options = {}) {
  const { allowSubstitutes = false, byId, byBase } = options;
  const map = { ...prevMap };
  const byIdMap = byId || new Map(ingredients.map((i) => [i.id, i]));
  const byBaseMap = byBase || buildByBase(ingredients);
  const add = (id) => {
    if (id == null) return;
    if (map[id]) {
      if (!map[id].includes(cocktail.id)) map[id].push(cocktail.id);
    } else {
      map[id] = [cocktail.id];
    }
  };
  if (Array.isArray(cocktail.ingredients)) {
    cocktail.ingredients.forEach((r) => {
      if (r.ingredientId == null) return;
      const ing = byIdMap.get(r.ingredientId);
      if (!ing) return;
      const baseId = ing.baseIngredientId ?? ing.id;
      const group = byBaseMap.get(baseId) || [];

      add(ing.id);

      if (ing.id === baseId) {
        group.forEach((item) => {
          if (item.id !== baseId) add(item.id);
        });
      } else {
        add(baseId);
        if (allowSubstitutes || r.allowBrandedSubstitutes) {
          group.forEach((item) => {
            if (item.id !== ing.id && item.id !== baseId) add(item.id);
          });
        }
      }

      if (Array.isArray(r.substitutes)) {
        r.substitutes.forEach((s) => add(s.id));
      }
    });
  }
  return map;
}

export function removeCocktailFromUsageMap(prevMap, ingredients, cocktail, options = {}) {
  const { allowSubstitutes = false, byId, byBase } = options;
  const map = { ...prevMap };
  if (!cocktail) return map;
  const byIdMap = byId || new Map(ingredients.map((i) => [i.id, i]));
  const byBaseMap = byBase || buildByBase(ingredients);
  const remove = (id) => {
    if (id == null) return;
    const arr = map[id];
    if (!Array.isArray(arr)) return;
    const idx = arr.indexOf(cocktail.id);
    if (idx >= 0) arr.splice(idx, 1);
    if (arr.length === 0) delete map[id];
  };
  if (Array.isArray(cocktail.ingredients)) {
    cocktail.ingredients.forEach((r) => {
      if (r.ingredientId == null) return;
      const ing = byIdMap.get(r.ingredientId);
      if (!ing) return;
      const baseId = ing.baseIngredientId ?? ing.id;
      const group = byBaseMap.get(baseId) || [];

      remove(ing.id);

      if (ing.id === baseId) {
        group.forEach((item) => {
          if (item.id !== baseId) remove(item.id);
        });
      } else {
        remove(baseId);
        if (allowSubstitutes || r.allowBrandedSubstitutes) {
          group.forEach((item) => {
            if (item.id !== ing.id && item.id !== baseId) remove(item.id);
          });
        }
      }

      if (Array.isArray(r.substitutes)) {
        r.substitutes.forEach((s) => remove(s.id));
      }
    });
  }
  return map;
}

export function applyUsageMapToIngredients(ingredients, usageMap, cocktails) {
  const nameMap = new Map(cocktails.map((c) => [c.id, c.name]));
  return ingredients.map((ing) => {
    const ids = usageMap[ing.id] || [];
    const usageCount = ids.length;
    const singleCocktailName =
      usageCount === 1 ? nameMap.get(ids[0]) || null : null;
    return { ...ing, usageCount, singleCocktailName };
  });
}
