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
        // branded ingredient used
        if (r.allowBaseSubstitution || r.allowBrandedSubstitutes) {
          group.forEach((item) => {
            if (item.id !== ing.id) add(item.id, c.id);
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
