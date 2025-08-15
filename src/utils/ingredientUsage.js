export function mapCocktailsByIngredient(ingredients, cocktails) {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const byBase = new Map();
  ingredients.forEach((i) => {
    const baseId = i.baseIngredientId ?? i.id;
    if (!byBase.has(baseId)) byBase.set(baseId, []);
    byBase.get(baseId).push(i);
  });

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
      const ing = byId.get(r.ingredientId);
      if (!ing) return;
      const baseId = ing.baseIngredientId ?? ing.id;
      const group = byBase.get(baseId) || [];

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
        if (r.allowBrandedSubstitutes) {
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

export function calculateIngredientUsage(ingredients, cocktails) {
  const map = mapCocktailsByIngredient(ingredients, cocktails);
  const result = {};
  ingredients.forEach((i) => {
    const arr = map[i.id];
    result[i.id] = Array.isArray(arr) ? arr.length : 0;
  });
  return result;
}

export function updateUsageMap(prevMap, ingredients, cocktails, options = {}) {
  const { changedIngredientIds = [], changedCocktailIds = [] } = options;
  const fullMap = mapCocktailsByIngredient(ingredients, cocktails);
  if (
    changedIngredientIds.length === 0 &&
    changedCocktailIds.length === 0
  ) {
    return fullMap;
  }
  const affected = new Set(changedIngredientIds);
  if (changedCocktailIds.length > 0) {
    for (const [ingId, ids] of Object.entries(fullMap)) {
      if (ids.some((id) => changedCocktailIds.includes(id))) {
        affected.add(Number(ingId));
      }
    }
  }
  const next = { ...prevMap };
  affected.forEach((id) => {
    if (fullMap[id]) next[id] = fullMap[id];
    else delete next[id];
  });
  return next;
}

export function addCocktailToUsageMap(prevMap, ingredients, cocktail) {
  const map = { ...prevMap };
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const byBase = new Map();
  ingredients.forEach((i) => {
    const baseId = i.baseIngredientId ?? i.id;
    if (!byBase.has(baseId)) byBase.set(baseId, []);
    byBase.get(baseId).push(i);
  });
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
      const ing = byId.get(r.ingredientId);
      if (!ing) return;
      const baseId = ing.baseIngredientId ?? ing.id;
      const group = byBase.get(baseId) || [];

      add(ing.id);

      if (ing.id === baseId) {
        group.forEach((item) => {
          if (item.id !== baseId) add(item.id);
        });
      } else {
        add(baseId);
        if (r.allowBrandedSubstitutes) {
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

export function removeCocktailFromUsageMap(prevMap, ingredients, cocktail) {
  const map = { ...prevMap };
  if (!cocktail) return map;
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const byBase = new Map();
  ingredients.forEach((i) => {
    const baseId = i.baseIngredientId ?? i.id;
    if (!byBase.has(baseId)) byBase.set(baseId, []);
    byBase.get(baseId).push(i);
  });
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
      const ing = byId.get(r.ingredientId);
      if (!ing) return;
      const baseId = ing.baseIngredientId ?? ing.id;
      const group = byBase.get(baseId) || [];

      remove(ing.id);

      if (ing.id === baseId) {
        group.forEach((item) => {
          if (item.id !== baseId) remove(item.id);
        });
      } else {
        remove(baseId);
        if (r.allowBrandedSubstitutes) {
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
